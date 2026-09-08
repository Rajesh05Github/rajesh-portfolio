# Security

## 1. Threat model

Two distinct trust boundaries:
- **Admin surface** (`/admin/*`, `/api/admin/*`) — authenticated, high-privilege, low-volume, human-operated.
- **Public surface** (`/`, `/api/chat`, other public reads) — unauthenticated, high-volume, adversarial by default. Assume: bot spam, flooding, token-exhaustion attempts, prompt injection, oversized payloads, scraping, session abuse (master prompt §37).

**Rule, never violated**: the public chatbot has zero path to admin APIs, zero path to raw SQL, zero path to the filesystem or shell. The LLM is never the security boundary — every tool it can call is a narrow, schema-validated, authorized function (master prompt §32-33, §72).

## 2. Admin authentication & authorization

- argon2id password hashing, opaque session tokens in HttpOnly + Secure + SameSite=Lax cookies (never `localStorage`) — see [ADR-0002](decisions/0002-admin-auth.md).
- Login rate limiting + exponential lockout per IP and per account after repeated failures (Redis counters).
- Session expiration (sliding window, e.g. 7 days idle) + explicit logout revokes the session row immediately (not just cookie deletion client-side).
- Every admin mutation route checks the session server-side (middleware) before touching `features/*` — no admin page renders sensitive data without a server-side auth check (never rely on hiding a nav link).
- RBAC check is a single `requirePermission(session, permission)` call per route, mapped in `lib/auth/permissions.ts` — even with one role in use today, every route is written as if RBAC is enforced (master prompt §9).

## 3. Input validation

Zod schemas at every boundary that receives external input: API route bodies, admin forms (validated again server-side, never trusting client-side validation alone), tool-call arguments returned by the LLM, chat message payloads, theme config objects. Invalid input is rejected with a 400 before it reaches any service/business logic.

## 4. Output validation

Any place the LLM is asked for structured output (intent classification, rerank scores, tool arguments) is validated against a Zod schema before use — a malformed or unexpected shape is treated as an error (falls back to a safe default route, e.g. `GENERAL_QUESTION` or a rejection), never blindly parsed/executed (master prompt §46, §71).

## 5. Tool calling boundary

Tools exposed to the LangGraph/LLM layer (`searchPortfolio`, `getProject`, `getExperience`, `getSkills`, `getResumeMetadata`, `searchKnowledge`) each:
- Have a strict Zod input schema (rejects anything else).
- Only ever query already-`PUBLISHED`, `includeInRag = true` data — there is no code path from a tool to unpublished/draft content or another visitor's data.
- Have a timeout and are logged (tool name, args, duration, requestId).
- Never execute arbitrary SQL, shell commands, or filesystem access — each tool is a specific, reviewed function calling a `features/*` service, same as any other internal caller.

## 6. Prompt injection defense (layered, not "solved")

- Clear separation in the prompt structure between system instructions (fixed, versioned, never visitor-controlled) and retrieved/user content (always wrapped and labeled as data, e.g. `<context>...</context>`, `<visitor_message>...</visitor_message>`).
- System prompt explicitly instructs the model to ignore any instructions appearing inside `<context>` or `<visitor_message>` and to never reveal its own system prompt or internal configuration.
- Output is scanned for obvious system-prompt leakage patterns before being streamed back (best-effort, not exhaustive).
- Tool authorization happens outside the LLM (§5) — even if injection tricks the model into "wanting" to call a tool with bad arguments, the tool itself re-validates and re-authorizes independently.
- We explicitly do **not** claim this eliminates prompt injection — only that no single successful injection can escalate to data exfiltration or unauthorized action, because the LLM's output is never trusted as an authorization decision.

## 7. RAG poisoning defense

Only admin-authored/admin-approved knowledge ever enters the vector index — there is no code path for a public visitor's chat message to be embedded and stored as retrievable knowledge. `KnowledgeDocument.visibility` must be `PUBLISHED` (an explicit admin action) before its chunks are retrievable; `DRAFT` knowledge is indexed (so the admin can preview it) but filtered out of every public-facing retrieval query (master prompt §44).

## 8. Abuse protection & rate limiting

Layered limits (Redis sliding-window counters), configurable in `lib/config` (master prompt §38):
- Per-IP: requests/minute, requests/hour.
- Per-session: messages/session cap, messages/day.
- Per-visitor (once identified): daily token budget.
- Per-endpoint: independent limits for `/api/chat` vs. other public routes.
- Global: a daily/monthly total token/cost ceiling — once hit, the chatbot degrades to a fixed "usage limit reached" message (master prompt §106) rather than continuing to spend.

Violations are recorded as `AbuseEvent` rows (kind: RATE_LIMIT/TOKEN_LIMIT/PROMPT_INJECTION/OVERSIZED_INPUT), visible on the admin security dashboard, not just silently dropped.

## 9. Error handling

Public-facing errors are always generic ("Something went wrong. Please try again.") — stack traces, internal error messages, and query details never reach the client. Full detail (requestId, error, stack, service, operation) goes to structured server logs only.

## 10. Audit logging

Every sensitive admin action (login, logout, content publish, theme change, knowledge update, resume replace, configuration change) writes an `AuditLog` row (actor, action, target, metadata, ip, timestamp) — this is what lets "who changed what, when" be answered without digging through logs.

## 11. What is explicitly out of scope for a portfolio project

CSRF protection relies on SameSite cookies + same-origin checks on state-changing routes rather than a separate token scheme (acceptable given this is a same-origin app with no third-party embed use case); a full WAF/DDoS mitigation layer is deferred to the hosting provider's edge (CloudFront/AWS WAF) rather than re-implemented in application code — see [deployment.md](deployment.md).
