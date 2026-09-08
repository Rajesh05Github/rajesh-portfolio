import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./_shared";
import { chatSession } from "./chat";

/**
 * Which kind of OpenAI call produced this row — needed because multiple
 * operations can share the same underlying model name (`gpt-4o-mini` backs
 * both intent classification and generation) and would otherwise be
 * indistinguishable in the cost dashboard's per-function breakdown
 * (docs/token-cost-control.md §5).
 */
export const usageOperation = pgEnum("usage_operation", [
  "INTENT_CLASSIFICATION",
  "RETRIEVAL_RERANK",
  "GENERATION",
  "EMBEDDING",
  "EVALUATION_JUDGE",
]);

/**
 * One row per real OpenAI call (chat completion or embedding) — the
 * ground-truth ledger the admin cost dashboard aggregates from
 * (docs/database-design.md §7, docs/token-cost-control.md §4). Append-only,
 * no `deletedAt` — a usage ledger is never edited or soft-deleted.
 *
 * `sessionId` is nullable: embedding calls happen during admin content
 * indexing (Phase 9's BullMQ worker), not inside any visitor `ChatSession`.
 */
export const usageRecord = pgTable(
  "usage_record",
  {
    id: idColumn(),
    requestId: uuid("request_id").notNull(),
    sessionId: uuid("session_id").references(() => chatSession.id, {
      onDelete: "set null",
    }),
    operation: usageOperation("operation").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),
    /** `numeric` (not `real`/`double`) — fractional cents at these token volumes must not accumulate float rounding error across a dashboard SUM(). */
    estimatedCostUsd: numeric("estimated_cost_usd", {
      precision: 12,
      scale: 8,
    }).notNull(),
    latencyMs: integer("latency_ms").notNull(),
    createdAt: timestampColumns.createdAt,
  },
  (table) => [
    index("usage_record_created_at_idx").on(table.createdAt),
    index("usage_record_session_id_idx").on(table.sessionId),
  ],
);

export type UsageRecord = typeof usageRecord.$inferSelect;
export type NewUsageRecord = typeof usageRecord.$inferInsert;
