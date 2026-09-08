import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./_shared";

/**
 * Singleton table — exactly one row, enforced at the application/service
 * layer (docs/database-design.md §2), not by a DB constraint. A separate
 * "singleton" constraint mechanism would be over-engineering for one row.
 */
export const profile = pgTable("profile", {
  id: idColumn(),
  name: text("name").notNull(),
  /** Shown in the navbar's brand mark instead of auto-deriving one from `name`'s first letter (Navbar defaults to that when this is empty — see components/portfolio/navbar.tsx). Free text, not just an initial, so "RK" or "Rajesh" work as well as "R". */
  brandLabel: text("brand_label"),
  headline: text("headline").notNull(),
  tagline: text("tagline"),
  avatarUrl: text("avatar_url"),
  /** Set only when `avatarUrl` is our own "/api/avatar" (an uploaded file, served from `storage`) — null when it's an admin-pasted external URL, which needs no content-type of our own to serve. */
  avatarContentType: text("avatar_content_type"),
  location: text("location"),
  availableForWork: boolean("available_for_work").notNull().default(false),
  ...timestampColumns,
});

export type Profile = typeof profile.$inferSelect;
export type NewProfile = typeof profile.$inferInsert;
