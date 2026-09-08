import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { idColumn } from "./_shared";

/**
 * fileUrl points at object storage (local volume in dev, S3 in prod) — never
 * bytea in Postgres (docs/database-design.md §6, master prompt §56).
 * Uploading a new resume inserts a new versioned row rather than overwriting;
 * only the isActive = true row is served publicly.
 */
export const resume = pgTable("resume", {
  id: idColumn(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  version: integer("version").notNull().default(1),
  downloadCount: integer("download_count").notNull().default(0),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Resume = typeof resume.$inferSelect;
export type NewResume = typeof resume.$inferInsert;
