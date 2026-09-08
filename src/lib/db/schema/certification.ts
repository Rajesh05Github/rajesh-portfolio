import { date, integer, pgTable, text } from "drizzle-orm/pg-core";
import {
  contentStatus,
  deletedAtColumn,
  idColumn,
  timestampColumns,
} from "./_shared";

export const certification = pgTable("certification", {
  id: idColumn(),
  name: text("name").notNull(),
  issuer: text("issuer").notNull(),
  issueDate: date("issue_date", { mode: "date" }).notNull(),
  expiryDate: date("expiry_date", { mode: "date" }),
  credentialUrl: text("credential_url"),
  displayOrder: integer("display_order").notNull().default(0),
  status: contentStatus("status").notNull().default("DRAFT"),
  deletedAt: deletedAtColumn(),
  ...timestampColumns,
});

export type Certification = typeof certification.$inferSelect;
export type NewCertification = typeof certification.$inferInsert;
