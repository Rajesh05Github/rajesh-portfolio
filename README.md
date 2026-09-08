# AI Portfolio Platform

A production-oriented, AI-powered personal portfolio: dynamic CMS, admin panel, theme engine, and a RAG-backed chatbot grounded in the site owner's real content. See [docs/README.md](docs/README.md) for the full architecture, database, RAG, security, and deployment design, plus the phased build roadmap.

## Local development

Prerequisites: Node.js 20+, Docker Desktop.

```bash
cp .env.example .env        # then edit values if needed (defaults work out of the box)
docker compose up -d        # Postgres (with pgvector) + Redis
npm install
npm run db:migrate          # apply schema
npm run db:seed             # insert clearly-marked SAMPLE data (see src/lib/db/seed.ts)
npm run admin:create -- --email=you@example.com --password=change-me-please  # bootstrap the one admin account
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public site, [http://localhost:3000/admin](http://localhost:3000/admin) for the admin area — log in with the account created above.

Note: if ports `5432`/`6379` are already in use on your machine by another project, override `POSTGRES_PORT`/`REDIS_PORT` (and the corresponding `DATABASE_URL`/`REDIS_URL`) in `.env`.

### AI knowledge indexing (Phase 9+)

Editing any Experience/Project/etc. entry (or its "AI Knowledge" tab) enqueues a background re-index job — run the worker to actually process them:

```bash
npm run worker:dev
```

Without a real `OPENAI_API_KEY` in `.env`, jobs run through extraction fine but fail at the embedding step with a clear "OPENAI_API_KEY is not set" error (visible on `/admin/ai/knowledge`, hover the status badge) — this is expected until you add a key, not a bug.

### Other scripts

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run format        # prettier --write
npm run db:generate   # generate a new Drizzle migration after editing src/lib/db/schema
npm run db:studio     # Drizzle Studio — browse/edit data in a UI
```

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · PostgreSQL + pgvector · Drizzle ORM · Redis · (LangChain/LangGraph + OpenAI arrive in later phases — see the roadmap)
