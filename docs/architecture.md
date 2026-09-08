# Architecture

## 1. System overview

```
                    AI PORTFOLIO PLATFORM
                            |
          +-----------------+-----------------+
          |                 |                 |
          v                 v                 v
    Public Portfolio     AI Chatbot       CV Download
          |
          v
    Dynamic CMS (Postgres)
          |
          v
      Admin Panel (separate auth)
```

Single Next.js (App Router) application serving three audiences behind one deploy:

- **Public visitors** — read-only portfolio pages (Server Components, cached, SEO'd) + the chatbot widget.
- **The admin (you)** — a separately-authenticated `/admin` area for editing content, themes, layout, AI knowledge, and viewing analytics/security/cost dashboards.
- **Background workers** — Redis-backed queue consumers that do the async work (embedding, evaluation, analytics aggregation) neither the visitor nor the admin should wait on synchronously.

## 2. Why this shape (answers to §109 "architectural uncertainty" rule)

| Need | Solved by | Why not something else |
|---|---|---|
| Routing, SSR/SSG, API layer, image optimization, metadata | Next.js App Router | Already required by the brief; avoids a separate Express/Fastify backend — Route Handlers under `app/api` are enough for this scale. See [ADR-0001](decisions/0001-nextjs-app-router.md). |
| Durable content, relational integrity, full-text search, vectors | PostgreSQL (+ `pgvector`, + `tsvector`) | One database instead of Postgres + a dedicated vector DB + a search engine. See [ADR-0003](decisions/0003-postgres-pgvector.md). |
| Rate limiting, token/cost counters, cache, queue backing | Redis | Ephemeral/high-speed workloads only — never source of truth. See [ADR-0004](decisions/0004-redis-roles.md). |
| Async embedding/evaluation/analytics work | BullMQ (Redis-backed queue) + a Node worker process | Justifies decoupling without adopting Kafka. See [ADR-0005](decisions/0005-queue-not-kafka.md). |
| LLM/embeddings/retriever plumbing | LangChain | Avoids hand-rolling OpenAI SDK wrappers, text splitters, retriever interfaces — but confined to `lib/ai/*`, never leaking into domain code. See [ADR-0006](decisions/0006-langchain-langgraph.md). |
| Controlled agentic routing (security → intent → retrieve → rerank → generate → validate) | LangGraph | A finite, auditable graph, not an open-ended autonomous agent. See [ADR-0006](decisions/0006-langchain-langgraph.md). |
| Admin session auth | Custom cookie-session auth (argon2 + HttpOnly/Secure/SameSite cookies, sessions in Postgres, hot lookup cached in Redis) | Single admin user, no third-party identity needed — a full OAuth/NextAuth stack would be overhead with no real benefit here. See [ADR-0002](decisions/0002-admin-auth.md). |
| ORM / DB access | Drizzle ORM | First-class `pgvector` column support, SQL-like query builder (educational value: you see the SQL), lighter runtime than Prisma. See [ADR-0007](decisions/0007-drizzle-orm.md). |

## 3. Module boundaries

```
src/
├── app/
│   ├── (public)/            # portfolio pages — Server Components by default
│   │   ├── page.tsx         # renders sections per PortfolioSection config
│   │   └── ...
│   ├── admin/                # separate layout, its own auth guard
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── profile/ about/ experience/ education/ skills/ projects/
│   │   ├── certifications/ achievements/ social-links/ resume/
│   │   ├── appearance/ (themes, customize)
│   │   ├── layout/ (sections — visibility + ordering)
│   │   ├── ai/ (knowledge, documents, rag, evaluation)
│   │   ├── analytics/ security/ settings/
│   ├── api/
│   │   ├── chat/             # public — visitor chatbot, heavily rate-limited
│   │   ├── portfolio/ projects/ resume/   # public read APIs (mostly unused — SSR fetches DB directly; kept for client-side interactions like CV download tracking)
│   │   └── admin/            # protected — everything CMS/AI/analytics mutation
│   └── ...
│
├── components/
│   ├── ui/                   # Button, Card, etc. — theme-token driven, no hardcoded colors
│   ├── portfolio/             # Hero, About, Projects, ... (Server Components)
│   ├── admin/                 # sidebar, tables, forms, drag-and-drop section list
│   ├── chatbot/                # widget, message list, visitor-info gate (Client Component)
│   └── theme/                  # ThemeProvider, live preview frame
│
├── features/                  # application/domain logic, one folder per bounded context
│   ├── portfolio/ projects/ experience/ themes/
│   ├── chatbot/ rag/ visitors/ analytics/ admin/
│   (each: schema (zod), service (business logic), repository (DB access), types)
│
├── lib/
│   ├── db/                    # drizzle client, schema, migrations
│   ├── redis/                 # client, rate-limit primitives, cache helpers
│   ├── ai/                    # EmbeddingService, LLM client, LangGraph graph, tools, prompts
│   ├── auth/                   # session creation/verification, password hashing
│   ├── security/                # rate limiter, abuse detection, input/output validation helpers
│   ├── validation/               # shared zod schemas
│   └── observability/             # logger, request tracing, usage recording
│
├── workers/                    # BullMQ worker processes (knowledge indexing, evaluation runs, analytics aggregation)
│
└── types/                      # cross-cutting domain types
```

**Rule**: `app/` contains routing/composition only. `features/*` contains the actual business logic and is what gets unit-tested. `lib/*` is infrastructure — no business rules. `components/*` is presentation only, never talks to the DB directly (Server Components call `features/*` services).

## 4. Server vs. Client Components

Default to Server Components. Client Components (`"use client"`) are used only where:
- Browser state/interactivity is required: mobile nav toggle, theme customizer live preview, chatbot widget, admin forms with client-side validation feedback, drag-and-drop section reordering, testimonial carousel.
- Everything else (Hero, About, Projects, Experience list rendering, section composition, metadata) is server-rendered directly from the database — no client-side data fetching for portfolio content.

## 5. Request flow — public chatbot (see [rag.md](rag.md) for detail)

```
Browser → /api/chat (Route Handler, streaming)
   → Security layer (schema validation, size limits)
   → Redis: rate limit + token budget check
   → LangGraph: security check → intent classification → route
        portfolio question → retrieve (hybrid) → rerank → context build → OpenAI → validate
        general question    → controlled canned/limited response
        abuse                → reject, log AbuseEvent
   → stream tokens back to browser
   → on completion: persist ChatMessage + UsageRecord
```

## 6. Request flow — admin content edit → knowledge sync

```
Admin edits Project (admin UI → /api/admin/projects/:id → service layer → Postgres)
   → row updated, `KnowledgeDocument` marked stale (or event emitted)
   → BullMQ job enqueued (KnowledgeIndexing)
   → worker: extract → clean → chunk → embed (OpenAI) → upsert pgvector rows
   → KnowledgeDocument.status = INDEXED, chunkCount updated
```

Admin never blocks on the embedding pipeline — the admin dashboard shows indexing status (PENDING/INDEXED/FAILED) and allows manual re-index.

## 7. Cross-cutting concerns

- **Configuration**: centralized in `lib/config` (model names, token limits, rate limits, retrieval params, cache TTLs) — no magic numbers scattered in route handlers. See [token-cost-control.md](token-cost-control.md).
- **Observability**: every AI request gets a `requestId`; stages are timed and logged structurally. See [architecture §11 of master prompt] and this repo's future `docs/observability.md` (added when Phase 17 lands).
- **Security**: layered — see [security.md](security.md).
- **Content status**: `DRAFT` / `PUBLISHED` / `ARCHIVED` on all CMS entities that support editorial workflow; public queries always filter `status = PUBLISHED`.

## 8. Roadmap

See the end of this document set — roadmap tracked in `docs/README.md` (created at the end of Phase 1) and mirrored in the project's task tracker during implementation.
