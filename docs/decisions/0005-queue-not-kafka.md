# ADR-0005: Redis-backed queue (BullMQ), not Kafka

## Problem
Some work (embedding generation after a content edit, evaluation runs, analytics aggregation, resume processing) should happen asynchronously so admin edits and visitor requests don't block on slow operations.

## Options
1. BullMQ (Redis-backed job queue) + a Node worker process.
2. Apache Kafka (or a managed equivalent, e.g. MSK) with consumer groups.
3. Do everything synchronously inline in the request handler.

## Decision
BullMQ, backed by the same Redis instance used for caching/rate-limiting, consumed by a small worker process (`src/workers`).

## Why
- Event volume here is low (an admin edits content occasionally; a handful of visitor chat sessions at a time) — nowhere near the throughput/partitioning/replay use cases Kafka exists for.
- BullMQ gives us job queues, retries with backoff, delayed jobs, and job status inspection (used by the admin's knowledge-indexing dashboard) with infrastructure we already run (Redis) — no new managed service, no new operational surface, no extra AWS bill line.
- Kafka's value (durable replayable log, high-throughput multi-consumer fan-out, strict ordering across huge partitions) doesn't map to any real requirement in this system. Adding it would be resume-driven development, which the brief explicitly warns against (§53, §110).
- Idempotent job handlers (keyed by document id + content version) make "lost job on Redis restart" a recoverable, not catastrophic, failure mode — acceptable at this scale.

## Tradeoffs
- BullMQ/Redis queues are less durable than Kafka by design (no long-term replay log) — mitigated by making every job re-triggerable from Postgres state (a document can always be manually or automatically re-indexed).
- If the system ever needed multiple independent consumer groups replaying the same event stream, this decision would need revisiting.
