import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./_shared";

/**
 * Enum-based RBAC from day one even though only SUPER_ADMIN is used today —
 * every admin route checks role via lib/auth/permissions.ts, so introducing
 * EDITOR/ANALYST later is a permissions-map change, not a schema migration
 * (docs/decisions/0002-admin-auth.md).
 */
export const adminRole = pgEnum("admin_role", [
  "SUPER_ADMIN",
  "EDITOR",
  "ANALYST",
]);

export const adminUser = pgTable("admin_user", {
  id: idColumn(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: adminRole("role").notNull().default("SUPER_ADMIN"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestampColumns,
});

/**
 * `id` is the SHA-256 hex digest of the raw session token that's actually
 * sent to the browser in the cookie — the token itself is never stored, so a
 * database read (backup, leak, admin query) can't be used to forge a session
 * (docs/decisions/0002-admin-auth.md; same approach as Lucia Auth's session
 * model). Revocation is instant: delete/mark the row, the cookie becomes
 * worthless immediately.
 */
export const adminSession = pgTable(
  "admin_session",
  {
    id: text("id").primaryKey(),
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => adminUser.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("admin_session_admin_user_id_idx").on(table.adminUserId)],
);

export type AdminUser = typeof adminUser.$inferSelect;
export type NewAdminUser = typeof adminUser.$inferInsert;
export type AdminSession = typeof adminSession.$inferSelect;
export type NewAdminSession = typeof adminSession.$inferInsert;
