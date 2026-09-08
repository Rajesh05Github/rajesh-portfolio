import { jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./_shared";

export type AboutHighlight = {
  icon: string;
  title: string;
  description: string;
};

/**
 * Singleton table (see profile.ts). `highlights` stays a small jsonb array
 * rather than a separate table — it's fixed-shape and never queried
 * independently (docs/database-design.md §2 — avoiding over-normalization).
 */
export const about = pgTable("about", {
  id: idColumn(),
  bio: text("bio").notNull(),
  missionQuote: text("mission_quote"),
  highlights: jsonb("highlights")
    .$type<AboutHighlight[]>()
    .notNull()
    .default([]),
  ...timestampColumns,
});

export type About = typeof about.$inferSelect;
export type NewAbout = typeof about.$inferInsert;
