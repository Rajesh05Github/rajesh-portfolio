"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { theme, themePreset } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { themeConfigSchema, type ThemeConfig } from "@/lib/theme/config";

function revalidateThemeRoutes() {
  revalidatePath("/admin/appearance/themes");
  revalidatePath("/admin/appearance/customize");
  revalidatePath("/"); // theme affects every public page under (public)
}

export async function listThemePresets() {
  await requirePermissionInAction(PERMISSIONS.THEME_WRITE);
  return db.select().from(themePreset).orderBy(themePreset.createdAt);
}

export async function listThemes() {
  await requirePermissionInAction(PERMISSIONS.THEME_WRITE);
  return db.select().from(theme).orderBy(theme.createdAt);
}

export async function getActiveTheme() {
  await requirePermissionInAction(PERMISSIONS.THEME_WRITE);
  const [row] = await db
    .select()
    .from(theme)
    .where(eq(theme.isActive, true))
    .limit(1);
  return row ?? null;
}

/** Activates a preset: reuses an existing Theme row tied to it if one exists, otherwise clones the preset's config into a new Theme row. Never writes to theme_preset itself (master prompt §16). */
export async function activatePreset(presetId: string) {
  const user = await requirePermissionInAction(PERMISSIONS.THEME_WRITE);

  const [preset] = await db
    .select()
    .from(themePreset)
    .where(eq(themePreset.id, presetId))
    .limit(1);
  if (!preset) throw new Error("Preset not found.");

  const existing = await db
    .select()
    .from(theme)
    .where(eq(theme.basePresetId, presetId))
    .limit(1);

  await db.transaction(async (tx) => {
    await tx
      .update(theme)
      .set({ isActive: false })
      .where(eq(theme.isActive, true));

    if (existing[0]) {
      await tx
        .update(theme)
        .set({ isActive: true })
        .where(eq(theme.id, existing[0].id));
    } else {
      await tx.insert(theme).values({
        name: preset.name,
        basePresetId: preset.id,
        config: preset.config,
        isActive: true,
      });
    }
  });

  await recordAuditLog({
    adminUserId: user.id,
    action: "theme.activate_preset",
    targetType: "theme_preset",
    targetId: presetId,
  });
  revalidateThemeRoutes();
}

export async function activateTheme(themeId: string) {
  const user = await requirePermissionInAction(PERMISSIONS.THEME_WRITE);

  await db.transaction(async (tx) => {
    await tx
      .update(theme)
      .set({ isActive: false })
      .where(eq(theme.isActive, true));
    await tx.update(theme).set({ isActive: true }).where(eq(theme.id, themeId));
  });

  await recordAuditLog({
    adminUserId: user.id,
    action: "theme.activate",
    targetType: "theme",
    targetId: themeId,
  });
  revalidateThemeRoutes();
}

/** Refused for the active theme — the app assumes exactly one active row always exists (features/theme/actions.ts's own activate functions rely on that invariant), so deleting it would leave the public site with no theme applied at all. Activate a different one first. */
export async function deleteTheme(themeId: string) {
  const user = await requirePermissionInAction(PERMISSIONS.THEME_WRITE);

  const [target] = await db
    .select()
    .from(theme)
    .where(eq(theme.id, themeId))
    .limit(1);
  if (!target) throw new Error("Theme not found.");
  if (target.isActive) {
    throw new Error(
      "Can't delete the active theme — activate a different one first.",
    );
  }

  await db.delete(theme).where(eq(theme.id, themeId));

  await recordAuditLog({
    adminUserId: user.id,
    action: "theme.delete",
    targetType: "theme",
    targetId: themeId,
  });
  revalidateThemeRoutes();
}

export async function duplicateTheme(themeId: string) {
  const user = await requirePermissionInAction(PERMISSIONS.THEME_WRITE);

  const [source] = await db
    .select()
    .from(theme)
    .where(eq(theme.id, themeId))
    .limit(1);
  if (!source) throw new Error("Theme not found.");

  const [copy] = await db
    .insert(theme)
    .values({
      name: `${source.name} Copy`,
      basePresetId: source.basePresetId,
      config: source.config,
      isActive: false,
    })
    .returning();

  await recordAuditLog({
    adminUserId: user.id,
    action: "theme.duplicate",
    targetType: "theme",
    targetId: copy?.id,
  });
  revalidateThemeRoutes();
}

/** Takes the parsed config directly (not FormData) — called programmatically from the theme builder's client component, not via native form submission (docs: live preview needs client state, so this isn't a plain <form action>). */
export async function updateActiveThemeConfig(config: ThemeConfig) {
  const user = await requirePermissionInAction(PERMISSIONS.THEME_WRITE);
  const parsed = themeConfigSchema.parse(config);

  const [active] = await db
    .select()
    .from(theme)
    .where(eq(theme.isActive, true))
    .limit(1);
  if (!active) throw new Error("No active theme to update.");

  await db.update(theme).set({ config: parsed }).where(eq(theme.id, active.id));
  await recordAuditLog({
    adminUserId: user.id,
    action: "theme.update_config",
    targetType: "theme",
    targetId: active.id,
  });
  revalidateThemeRoutes();
}

/** Resets the active theme's config back to its base preset's config, if it has one. Returns the restored config so the client can update its preview state immediately. */
export async function resetActiveThemeToPreset(): Promise<ThemeConfig | null> {
  const user = await requirePermissionInAction(PERMISSIONS.THEME_WRITE);

  const [active] = await db
    .select()
    .from(theme)
    .where(eq(theme.isActive, true))
    .limit(1);
  if (!active?.basePresetId) return null;

  const [preset] = await db
    .select()
    .from(themePreset)
    .where(eq(themePreset.id, active.basePresetId))
    .limit(1);
  if (!preset) return null;

  await db
    .update(theme)
    .set({ config: preset.config })
    .where(eq(theme.id, active.id));
  await recordAuditLog({
    adminUserId: user.id,
    action: "theme.reset_to_preset",
    targetType: "theme",
    targetId: active.id,
  });
  revalidateThemeRoutes();

  return preset.config;
}
