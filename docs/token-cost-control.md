# Token & Cost Control

## 1. Why this exists as its own layer

An unauthenticated, public-facing LLM endpoint is a direct cost-exposure surface. Every limit below exists to bound worst-case spend to a known, configured ceiling — not to "feel secure," but to guarantee it mathematically (a hit ceiling hard-stops further spend, it doesn't just log a warning).

## 2. Layered limits (per master prompt §39)

| Layer | Limit | Enforced by |
|---|---|---|
| Input | Max request body size, max message length, max estimated input tokens (tiktoken estimate before calling OpenAI) | Route handler, before any DB/LLM call |
| Retrieval | Max chunks retrieved, max chunks after rerank, max context tokens | `features/rag/context-builder.ts`, config-driven |
| Output | Max output tokens (`max_tokens` on the completion call) | LLM client wrapper in `lib/ai` |
| Session | Max messages/session, max total tokens/session | Redis counter, checked before each turn; `ChatSession.totalTokens` as durable record |
| Visitor | Daily token budget | Redis counter keyed by visitor id (or ip-hash pre-identification) |
| IP | Requests/tokens per time window | Redis sliding window |
| Global | Daily/monthly total token or cost ceiling | Redis counter, checked first, cheapest possible short-circuit |

All numeric limits live in `lib/config/limits.ts` — never inlined as magic numbers in route handlers (master prompt §74).

## 3. Model routing

Simple, well-defined operations (intent classification, reranking scores) use a smaller/cheaper model; portfolio-question generation uses a stronger model only when needed. The exact model identifiers are a single config map (`lib/config/models.ts`), re-checked against OpenAI's currently-supported models at implementation time rather than hardcoded from this document (models available change over time — see master prompt §41).

```ts
// shape, not final values
export const MODELS = {
  intentClassification: "gpt-4o-mini",   // cheap, structured-output, low latency
  rerank: "gpt-4o-mini",
  generation: "gpt-4o-mini",              // default; escalate only if evaluation shows quality gaps
  embedding: "text-embedding-3-small",
} as const;
```

## 4. Cost estimation

`lib/ai/cost.ts`: `estimateCost(model, inputTokens, outputTokens)` reads from a pricing config table (`lib/config/pricing.ts`) — not hardcoded per call site — so a provider price change is a one-line config update. Every OpenAI call (chat completion *and* embedding) produces a `UsageRecord` row: `requestId, sessionId, model, inputTokens, outputTokens, totalTokens, estimatedCostUsd, latencyMs`.

## 5. Admin cost dashboard

Aggregates `UsageRecord` over Today/This week/This month: total requests, total tokens, estimated cost, average latency, top sessions by token consumption, count of rate-limit/abuse events. Built entirely from real `UsageRecord`/`AbuseEvent` rows — no fabricated metrics (master prompt §97).

## 6. Caching as cost control

Frequent, non-personalized Q&A and retrieval results are cached (Redis, TTL-bound, invalidated on knowledge re-index) — a repeated common question ("what's your tech stack?") doesn't re-run embedding + retrieval + generation every time.

## 7. Resilience without runaway cost

Failed OpenAI calls get limited retries with exponential backoff (not unbounded retry loops) and a circuit-breaker-style short-circuit if the provider is degraded (a run of failures within a window trips a temporary "AI unavailable" fallback response) — retries never bypass the token/cost budgets above; a retried call still counts against the same session/visitor/global counters.

## 8. Streaming and accounting

Responses are streamed to the browser (see architecture.md), but token accounting happens server-side against the actual completion usage data returned by the OpenAI API at stream end — the rate limiter's pre-check uses an estimate (tiktoken) to decide whether to even start the call, and the `UsageRecord` afterward uses the real reported usage, reconciling any estimate drift.
