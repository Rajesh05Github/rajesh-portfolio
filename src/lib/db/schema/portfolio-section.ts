import { boolean, integer, pgEnum, pgTable } from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./_shared";

export const portfolioSectionKey = pgEnum("portfolio_section_key", [
  "HERO",
  "ABOUT",
  "EXPERIENCE",
  "EDUCATION",
  "SKILLS",
  "PROJECTS",
  "CERTIFICATIONS",
  "ACHIEVEMENTS",
  "SERVICES",
  "CONTACT",
]);

/**
 * Single source of truth for what renders on the public page and in what
 * order (docs/database-design.md §3) — the public page iterates this table,
 * it never hardcodes a section array like the reference repo's App.jsx did.
 */
export const portfolioSection = pgTable("portfolio_section", {
  id: idColumn(),
  key: portfolioSectionKey("key").notNull().unique(),
  isVisible: boolean("is_visible").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  ...timestampColumns,
});

export type PortfolioSection = typeof portfolioSection.$inferSelect;
export type NewPortfolioSection = typeof portfolioSection.$inferInsert;
