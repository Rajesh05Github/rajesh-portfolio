# Observability

## 1. Scope

A single-instance app at this project's scale doesn't need distributed tracing or an external APM service (Datadog, Honeycomb, an OpenTelemetry collector) — that would be complexity without a real driving need (master prompt's recurring theme). What it does need, and what this phase builds:

- **Structured logs** instead of ad hoc `console.log`/`console.error` calls, so a request's full lifecycle can be read back, not just guessed at from scattered strings.
- **Request tracing**: one `requestId` per chat turn, present on every log line and every persisted row (`ChatMessage`, `UsageRecord`) that turn touches.
- **Per-stage latency**: how long each stage of a chat turn took, not just the total.

## 2. The logger (`lib/observability/logger.ts`)

One entry point, four levels (`debug`/`info`/`warn`/`error`). No `import "server-only"` — it's used by `workers/knowledge-indexing-worker.ts`, a standalone process outside the Next.js app.

- **Development**: human-readable — `[observability] (service) message {fields}`.
- **Production** (`NODE_ENV=production`): one JSON object per line on stdout — `{timestamp, level, message, ...fields}`. This is deliberately the same format a log aggregator that tails stdout (CloudWatch Logs agent on ECS/Fargate, Loki's promtail, etc. — see [deployment.md](deployment.md)) ingests with zero code changes, so upgrading to real log aggregation later doesn't require touching this file.
- An `Error` value anywhere in the fields is serialized to `{name, message, stack}` — `JSON.stringify(someError)` alone produces `{}`, which would silently swallow every error's detail.

## 3. Request tracing

`requestId` (a `randomUUID()`) is generated once per chat turn — at the top of `/api/chat`'s `POST` handler, or inside `runChatGraph()` for the admin chat-test tool and evaluation runs — and threaded through:

- `ChatGraphState.requestId` — read by every graph node.
- Every `UsageRecord` row a turn produces (intent classification, rerank, generation, evaluation judge).
- The `ChatMessage` rows (visitor + assistant) for that turn.

It is **not** present on `AbuseEvent` rows rejected before a `requestId` exists (rate-limit/token-budget checks happen before the id is generated) — those are correlated by session/IP instead (Phase 15), which is the correct correlation key for that failure mode.

`/admin/observability` is the practical payoff: paste a `requestId`, see every `ChatMessage` and `UsageRecord` row it produced — cost, tokens, latency, per operation — without grepping logs.

## 4. Per-stage latency

`lib/observability/timer.ts`'s `startTimer()` is a plain `Date.now()` stopwatch. `features/chatbot/graph/index.ts` wraps every graph node (`security`, `classifyIntent`, `retrieve`, `generate`, `tools`, `validate`, `generalResponse`, `reject`) with `withNodeLogging()` — a single wrapper applied at graph-construction time, not a hand-added log line inside each node file. Every node emits one `graph node completed` (or `graph node failed`) log line with `requestId`, `sessionId`, `durationMs`, and a small summary of what it decided (intent, chunks retrieved, tool-call count, tokens used so far) — full message history and chunk text are deliberately excluded from the log line since they're already recoverable from `ChatMessage`/`UsageRecord` rows and would make every line unreadably large.

`/api/chat` itself logs `chat request received` and `chat request completed` (with total duration) around the whole turn, so a single grep for a `requestId` reconstructs the entire timeline: received → security → classifyIntent → retrieve → generate (× N tool rounds) → validate → completed.

## 5. What this is not

- Not a replacement for `UsageRecord`'s cost/token accounting (Phase 14) or `AbuseEvent`'s violation log (Phase 15) — those remain the durable, queryable source of truth; logs are for reconstructing *what happened during* a request, not for dashboards (the usage and security dashboards already exist and read from their own tables).
- Not log retention/rotation/shipping — that's an operational concern for whatever environment actually runs this in production (Phase 21), not application code.
