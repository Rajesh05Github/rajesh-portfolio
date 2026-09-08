import { boolean, integer, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./_shared";

export const socialPlatform = pgEnum("social_platform", [
  "GITHUB",
  "LINKEDIN",
  "TWITTER",
  "EMAIL",
  "WEBSITE",
  "OTHER",
]);

export const socialLink = pgTable("social_link", {
  id: idColumn(),
  platform: socialPlatform("platform").notNull(),
  url: text("url").notNull(),
  label: text("label"),
  displayOrder: integer("display_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  ...timestampColumns,
});

export type SocialLink = typeof socialLink.$inferSelect;
export type NewSocialLink = typeof socialLink.$inferInsert;
