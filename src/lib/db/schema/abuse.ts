import { index, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./_shared";
import { chatSession } from "./chat";

export const abuseEventKind = pgEnum("abuse_event_kind", [
  "RATE_LIMIT",
  "TOKEN_LIMIT",
  "PROMPT_INJECTION",
  "OVERSIZED_INPUT",
  "OTHER",
]);

/**
 * A violation log, not a blocking mechanism — the block already happened
 * (a 429/503 response, or the graph routing to `reject`) by the time a row
 * lands here. This exists so violations are visible on the admin security
 * dashboard instead of only appearing as ephemeral Redis counters or server
 * logs nobody reads (docs/security.md §8). Append-only, no `deletedAt`.
 */
export const abuseEvent = pgTable(
  "abuse_event",
  {
    id: idColumn(),
    sessionId: uuid("session_id").references(() => chatSession.id, {
      onDelete: "set null",
    }),
    ipHash: text("ip_hash"),
    kind: abuseEventKind("kind").notNull(),
    detail: text("detail"),
    createdAt: timestampColumns.createdAt,
  },
  (table) => [
    index("abuse_event_created_at_idx").on(table.createdAt),
    index("abuse_event_kind_idx").on(table.kind),
  ],
);

export type AbuseEvent = typeof abuseEvent.$inferSelect;
export type NewAbuseEvent = typeof abuseEvent.$inferInsert;
