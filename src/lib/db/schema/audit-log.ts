import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { idColumn } from "./_shared";
import { adminUser } from "./admin";

/**
 * Tracks sensitive admin operations (docs/database-design.md §7, master
 * prompt §83) — append-only, no soft delete, no updatedAt: an audit trail
 * that could be edited after the fact isn't an audit trail.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: idColumn(),
    adminUserId: uuid("admin_user_id").references(() => adminUser.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // e.g. "admin.login", "admin.login_failed", "admin.logout"
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("audit_log_created_at_idx").on(table.createdAt)],
);

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
