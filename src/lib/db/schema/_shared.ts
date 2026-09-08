import { pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * DRAFT | PUBLISHED | ARCHIVED on every publicly-rendered content entity
 * (docs/database-design.md). Public queries always filter status = 'PUBLISHED'.
 */
export const contentStatus = pgEnum("content_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const idColumn = () => uuid("id").primaryKey().defaultRandom();

export const timestampColumns = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Soft-delete column — only on entities an admin might want to restore (docs/database-design.md conventions). */
export const deletedAtColumn = () =>
  timestamp("deleted_at", { withTimezone: true });
