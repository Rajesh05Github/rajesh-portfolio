import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { theme } from "@/lib/db/schema";
import { DEFAULT_THEME_CONFIG, type ThemeConfig } from "@/lib/theme/config";

/** Public read — falls back to the hardcoded default if no theme is active yet (shouldn't happen once seeded, but the public site must never 500 over a missing theme row). */
export async function getActiveThemeConfig(): Promise<ThemeConfig> {
  const [row] = await db
    .select()
    .from(theme)
    .where(eq(theme.isActive, true))
    .limit(1);
  return row?.config ?? DEFAULT_THEME_CONFIG;
}
