import { date, integer, pgTable, text } from "drizzle-orm/pg-core";
import {
  contentStatus,
  deletedAtColumn,
  idColumn,
  timestampColumns,
} from "./_shared";

export const achievement = pgTable("achievement", {
  id: idColumn(),
  title: text("title").notNull(),
  description: text("description"),
  date: date("date", { mode: "date" }).notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  status: contentStatus("status").notNull().default("DRAFT"),
  deletedAt: deletedAtColumn(),
  ...timestampColumns,
});

export type Achievement = typeof achievement.$inferSelect;
export type NewAchievement = typeof achievement.$inferInsert;
