"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { socialLink } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { computeReorderSwap } from "@/lib/db/reorder";

const socialLinkSchema = z.object({
  platform: z.enum([
    "GITHUB",
    "LINKEDIN",
    "TWITTER",
    "EMAIL",
    "WEBSITE",
    "OTHER",
  ]),
  // Deliberately not `.url()` — mailto: values (and other schemes some
  // platforms use) can fail that validator, so keep this a light non-empty check.
  url: z.string().min(1).max(2000),
  label: z.string().max(200).optional().or(z.literal("")),
});

async function nextDisplayOrder(): Promise<number> {
  const rows = await db
    .select({ displayOrder: socialLink.displayOrder })
    .from(socialLink)
    .orderBy(asc(socialLink.displayOrder));
  return rows.length === 0
    ? 0
    : Math.max(...rows.map((r) => r.displayOrder)) + 1;
}

export async function createSocialLink(formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = socialLinkSchema.parse(Object.fromEntries(formData));

  const [row] = await db
    .insert(socialLink)
    .values({
      platform: parsed.platform,
      url: parsed.url,
      label: parsed.label ? parsed.label : null,
      displayOrder: await nextDisplayOrder(),
      isVisible: true,
    })
    .returning();

  await recordAuditLog({
    adminUserId: user.id,
    action: "social_link.create",
    targetType: "social_link",
    targetId: row?.id,
  });
  revalidatePath("/admin/social-links");
  revalidatePath("/");
  redirect("/admin/social-links");
}

export async function updateSocialLink(id: string, formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = socialLinkSchema.parse(Object.fromEntries(formData));

  await db
    .update(socialLink)
    .set({
      platform: parsed.platform,
      url: parsed.url,
      label: parsed.label ? parsed.label : null,
    })
    .where(eq(socialLink.id, id));

  await recordAuditLog({
    adminUserId: user.id,
    action: "social_link.update",
    targetType: "social_link",
    targetId: id,
  });
  revalidatePath("/admin/social-links");
  revalidatePath("/");
  redirect("/admin/social-links");
}

export async function deleteSocialLink(id: string) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  await db.delete(socialLink).where(eq(socialLink.id, id));
  await recordAuditLog({
    adminUserId: user.id,
    action: "social_link.delete",
    targetType: "social_link",
    targetId: id,
  });
  revalidatePath("/admin/social-links");
  revalidatePath("/");
}

export async function toggleSocialLinkVisibility(
  id: string,
  currentlyVisible: boolean,
) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  await db
    .update(socialLink)
    .set({ isVisible: !currentlyVisible })
    .where(eq(socialLink.id, id));
  await recordAuditLog({
    adminUserId: user.id,
    action: "social_link.visibility",
    targetType: "social_link",
    targetId: id,
    metadata: { isVisible: !currentlyVisible },
  });
  revalidatePath("/admin/social-links");
  revalidatePath("/");
}

export async function moveSocialLink(direction: "up" | "down", id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);

  const items = await db
    .select({ id: socialLink.id, displayOrder: socialLink.displayOrder })
    .from(socialLink)
    .orderBy(asc(socialLink.displayOrder));

  const swap = computeReorderSwap(items, id, direction);
  if (!swap) return;
  const [a, b] = swap;

  await db.transaction(async (tx) => {
    await tx
      .update(socialLink)
      .set({ displayOrder: b.displayOrder })
      .where(eq(socialLink.id, a.id));
    await tx
      .update(socialLink)
      .set({ displayOrder: a.displayOrder })
      .where(eq(socialLink.id, b.id));
  });

  revalidatePath("/admin/social-links");
  revalidatePath("/");
}

export async function listSocialLinks() {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  return db.select().from(socialLink).orderBy(asc(socialLink.displayOrder));
}

export async function getSocialLinkById(id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  const [row] = await db
    .select()
    .from(socialLink)
    .where(eq(socialLink.id, id))
    .limit(1);
  return row ?? null;
}
