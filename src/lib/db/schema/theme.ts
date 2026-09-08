import { boolean, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./_shared";
import type { ThemeConfig } from "@/lib/theme/config";

/**
 * Immutable "factory" presets — customizing a theme never writes to this
 * table (docs/database-design.md §3, master prompt §16). Seeded data only;
 * no admin CRUD mutates these rows.
 */
export const themePreset = pgTable("theme_preset", {
  id: idColumn(),
  name: text("name").notNull(),
  config: jsonb("config").$type<ThemeConfig>().notNull(),
  createdAt: timestampColumns.createdAt,
});

/**
 * A live, editable theme. Exactly one row has `isActive = true` at a time
 * (enforced at the application layer, not a DB constraint — see
 * features/theme/actions.ts). `basePresetId` is set when this theme
 * originated from a preset ("Activate" clones the preset's config into a
 * new/reused Theme row) — resetting restores this row's config back to that
 * preset's config, without ever touching the preset itself.
 */
export const theme = pgTable("theme", {
  id: idColumn(),
  name: text("name").notNull(),
  basePresetId: uuid("base_preset_id").references(() => themePreset.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").notNull().default(false),
  config: jsonb("config").$type<ThemeConfig>().notNull(),
  ...timestampColumns,
});

export type ThemePreset = typeof themePreset.$inferSelect;
export type NewThemePreset = typeof themePreset.$inferInsert;
export type Theme = typeof theme.$inferSelect;
export type NewTheme = typeof theme.$inferInsert;
