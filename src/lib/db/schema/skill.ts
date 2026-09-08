import { integer, pgEnum, pgTable, smallint, text } from "drizzle-orm/pg-core";
import { contentStatus, idColumn, timestampColumns } from "./_shared";

export const skillCategory = pgEnum("skill_category", [
  "LANGUAGE",
  "FRAMEWORK",
  "DATABASE",
  "TOOL",
  "PLATFORM",
  "SOFT_SKILL",
]);

export const skill = pgTable("skill", {
  id: idColumn(),
  name: text("name").notNull(),
  category: skillCategory("category").notNull(),
  proficiency: smallint("proficiency"), // 1-5, nullable — not every skill needs a self-rating
  displayOrder: integer("display_order").notNull().default(0),
  status: contentStatus("status").notNull().default("DRAFT"),
  ...timestampColumns,
});

export type Skill = typeof skill.$inferSelect;
export type NewSkill = typeof skill.$inferInsert;
