import { date, integer, pgTable, text } from "drizzle-orm/pg-core";
import {
  contentStatus,
  deletedAtColumn,
  idColumn,
  timestampColumns,
} from "./_shared";

export const education = pgTable("education", {
  id: idColumn(),
  institution: text("institution").notNull(),
  degree: text("degree").notNull(),
  field: text("field"),
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  status: contentStatus("status").notNull().default("DRAFT"),
  deletedAt: deletedAtColumn(),
  ...timestampColumns,
});

export type Education = typeof education.$inferSelect;
export type NewEducation = typeof education.$inferInsert;
