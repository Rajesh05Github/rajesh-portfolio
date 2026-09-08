import { date, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import {
  contentStatus,
  deletedAtColumn,
  idColumn,
  timestampColumns,
} from "./_shared";

export const experience = pgTable("experience", {
  id: idColumn(),
  role: text("role").notNull(),
  company: text("company").notNull(),
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }), // null = current role
  description: text("description").notNull(),
  technologies: jsonb("technologies").$type<string[]>().notNull().default([]),
  displayOrder: integer("display_order").notNull().default(0),
  status: contentStatus("status").notNull().default("DRAFT"),
  deletedAt: deletedAtColumn(),
  ...timestampColumns,
});

export type Experience = typeof experience.$inferSelect;
export type NewExperience = typeof experience.$inferInsert;
