"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";

const profileSchema = z.object({
  name: z.string().min(1).max(200),
  brandLabel: z.string().max(10).or(z.literal("")),
  headline: z.string().min(1).max(300),
  tagline: z.string().max(500).or(z.literal("")),
  // Either a real external URL (admin-pasted) or our own "/api/avatar" path
  // (set by the upload route, /api/admin/avatar) — not a valid absolute URL
  // itself, so it needs its own branch rather than just `z.string().url()`.
  avatarUrl: z.string().url().or(z.literal("/api/avatar")).or(z.literal("")),
  location: z.string().max(200).or(z.literal("")),
  availableForWork: z.enum(["on"]).optional(),
});

export async function updateProfile(formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = profileSchema.parse(Object.fromEntries(formData));

  const [current] = await db.select({ id: profile.id }).from(profile).limit(1);
  if (!current) {
    throw new Error("Profile row not found.");
  }

  await db
    .update(profile)
    .set({
      name: parsed.name,
      brandLabel: parsed.brandLabel || null,
      headline: parsed.headline,
      tagline: parsed.tagline || null,
      avatarUrl: parsed.avatarUrl || null,
      // Only meaningful alongside our own "/api/avatar" URL (set by the
      // upload route) — clear it whenever this form sets anything else, so
      // an old uploaded file's content-type never lingers unused.
      avatarContentType: parsed.avatarUrl === "/api/avatar" ? undefined : null,
      location: parsed.location || null,
      availableForWork: parsed.availableForWork === "on",
    })
    .where(eq(profile.id, current.id));

  await recordAuditLog({
    adminUserId: user.id,
    action: "profile.update",
    targetType: "profile",
    targetId: current.id,
  });
  revalidatePath("/admin/profile");
  revalidatePath("/");
  redirect("/admin/profile");
}

export async function getProfileForAdmin() {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  const [row] = await db.select().from(profile).limit(1);
  return row ?? null;
}
