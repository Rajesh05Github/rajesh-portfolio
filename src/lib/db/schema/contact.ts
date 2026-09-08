import { index, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./_shared";

export const contactMessageStatus = pgEnum("contact_message_status", [
  "NEW",
  "READ",
  "ARCHIVED",
]);

/**
 * Submissions from the public contact form (src/components/portfolio/contact.tsx).
 * An inbox, not editable content — the only field an admin ever changes is
 * `status`, so there's no `updatedAt`/draft-publish lifecycle here, just
 * `createdAt` (see timestampColumns usage below).
 */
export const contactMessage = pgTable(
  "contact_message",
  {
    id: idColumn(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject"),
    message: text("message").notNull(),
    status: contactMessageStatus("status").notNull().default("NEW"),
    // Never store a raw IP alongside submitted content — only its hash, for
    // coarse abuse correlation, same convention as chat/visitor rows.
    ipHash: text("ip_hash"),
    createdAt: timestampColumns.createdAt,
  },
  (table) => [index("contact_message_created_at_idx").on(table.createdAt)],
);

export type ContactMessage = typeof contactMessage.$inferSelect;
export type NewContactMessage = typeof contactMessage.$inferInsert;
