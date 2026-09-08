# ADR-0004: Redis scope — ephemeral/fast-path only, never source of truth

## Problem
The system needs low-latency counters (rate limits, token budgets), a cache layer, session-lookup acceleration, and a queue backend. We must avoid Redis becoming a second, inconsistent source of truth for durable content.

## Decision
Redis is used exclusively for:
- Rate limiting (sliding-window counters: per-IP, per-session, per-visitor, per-endpoint, global)
- Token/cost budget counters (per-session, per-visitor, per-day, global)
- Caching (portfolio config, theme config, retrieval results, popular chatbot Q&A) with explicit TTLs
- Session hot-path cache (session row also persisted in Postgres; Redis just avoids a DB round-trip on every request)
- BullMQ queue backing (embedding jobs, evaluation runs, analytics aggregation)
- Distributed locks (e.g., preventing duplicate concurrent re-indexing of the same document)

PostgreSQL remains the durable source of truth for every entity in [database-design.md](database-design.md). Nothing in Redis is the only copy of data that matters if lost — worst case on a Redis flush: rate limits reset, caches are cold, in-flight queue jobs are lost and must be re-triggered (idempotent by design, see §63 of the master prompt).

## Why
This boundary is what lets us reason about consistency: if Redis and Postgres ever disagree, Postgres wins, always. It also keeps Redis usage genuinely justified rather than "because it's fast" — every use above is either ephemeral by nature (rate-limit windows) or a cache with a defined TTL and a source it can be rebuilt from.

## Tradeoffs
- Cache invalidation on content edits must be explicit (delete/update the Redis key when the admin publishes a change) — an extra step versus letting a stale cache expire, but necessary since portfolio content changes should reflect near-instantly on the public site.
