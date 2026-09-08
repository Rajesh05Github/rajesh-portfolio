import { boolean, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import {
  contentStatus,
  deletedAtColumn,
  idColumn,
  timestampColumns,
} from "./_shared";

export const project = pgTable("project", {
  id: idColumn(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  longDescription: text("long_description"),
  coverImageUrl: text("cover_image_url"),
  liveUrl: text("live_url"),
  githubUrl: text("github_url"),
  featured: boolean("featured").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  status: contentStatus("status").notNull().default("DRAFT"),
  deletedAt: deletedAtColumn(),
  ...timestampColumns,
});

// Normalized (not jsonb) — tags are filterable and reused across the tag
// cloud / RAG metadata (docs/database-design.md §2).
export const projectTechnology = pgTable("project_technology", {
  id: idColumn(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  technology: text("technology").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const projectImage = pgTable("project_image", {
  id: idColumn(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  altText: text("alt_text"),
  displayOrder: integer("display_order").notNull().default(0),
});

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type ProjectTechnology = typeof projectTechnology.$inferSelect;
export type NewProjectTechnology = typeof projectTechnology.$inferInsert;
export type ProjectImage = typeof projectImage.$inferSelect;
export type NewProjectImage = typeof projectImage.$inferInsert;
