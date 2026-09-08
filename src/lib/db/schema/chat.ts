import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./_shared";

export const visitorType = pgEnum("visitor_type", [
  "RECRUITER",
  "HR",
  "DEVELOPER",
  "CLIENT",
  "POTENTIAL_CLIENT",
  "COMPANY",
  "STUDENT",
  "OTHER",
]);

/**
 * A visitor row only exists when the visitor voluntarily filled in the
 * chat widget's optional info gate — most `ChatSession`s have no linked
 * `Visitor` at all (docs/database-design.md §5). No `email`/`name`
 * uniqueness constraint: the same person could give different names or
 * skip entirely across sessions, and this isn't an account system.
 */
export const visitor = pgTable("visitor", {
  id: idColumn(),
  name: text("name"),
  email: text("email"),
  visitorType: visitorType("visitor_type"),
  purpose: text("purpose"),
  consentGivenAt: timestamp("consent_given_at", { withTimezone: true }),
  ipHash: text("ip_hash"),
  createdAt: timestampColumns.createdAt,
});

export const chatSessionStatus = pgEnum("chat_session_status", [
  "ACTIVE",
  "ENDED",
  "RATE_LIMITED",
  "BLOCKED",
]);

/**
 * The session cookie carries this row's own `id` directly (no separate
 * hashed-token indirection like `AdminSession`) — an anonymous portfolio
 * chat transcript is a fundamentally lower-stakes secret than an
 * authenticated admin session, so the extra layer isn't worth the
 * complexity here (docs/security.md).
 */
export const chatSession = pgTable("chat_session", {
  id: idColumn(),
  visitorId: uuid("visitor_id").references(() => visitor.id, {
    onDelete: "set null",
  }),
  status: chatSessionStatus("status").notNull().default("ACTIVE"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  messageCount: integer("message_count").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  createdAt: timestampColumns.createdAt,
});

export const chatMessageRole = pgEnum("chat_message_role", [
  "VISITOR",
  "ASSISTANT",
  "SYSTEM",
]);

export const chatMessageIntent = pgEnum("chat_message_intent", [
  "PORTFOLIO_QUESTION",
  "GENERAL_QUESTION",
  "ABUSE",
]);

/**
 * Append-only (no `deletedAt`) — a transcript log, not editable content
 * (docs/database-design.md conventions). `retrievedChunkIds` records which
 * `KnowledgeChunk`s fed an assistant answer, for grounding audit; null on
 * visitor messages and on assistant messages that didn't retrieve anything
 * (general/rejected).
 */
export const chatMessage = pgTable(
  "chat_message",
  {
    id: idColumn(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSession.id, { onDelete: "cascade" }),
    role: chatMessageRole("role").notNull(),
    content: text("content").notNull(),
    intent: chatMessageIntent("intent"),
    retrievedChunkIds: jsonb("retrieved_chunk_ids").$type<string[]>(),
    requestId: uuid("request_id"),
    createdAt: timestampColumns.createdAt,
  },
  (table) => [
    index("chat_message_session_id_idx").on(table.sessionId),
    index("chat_message_created_at_idx").on(table.createdAt),
  ],
);

export type Visitor = typeof visitor.$inferSelect;
export type NewVisitor = typeof visitor.$inferInsert;
export type ChatSession = typeof chatSession.$inferSelect;
export type NewChatSession = typeof chatSession.$inferInsert;
export type ChatMessage = typeof chatMessage.$inferSelect;
export type NewChatMessage = typeof chatMessage.$inferInsert;
