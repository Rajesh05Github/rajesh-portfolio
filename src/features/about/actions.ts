"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { about, type AboutHighlight } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { syncKnowledgeForEntity } from "@/features/knowledge/sync";

const aboutSchema = z.object({
  bio: z.string().min(1).max(10000),
  missionQuote: z.string().max(1000).or(z.literal("")),
  highlightsText: z.string().max(5000),
});

// Deliberately simple flat-text representation ("icon|title|description" per
// line) instead of a dynamic array-of-objects form UI — see feature spec.
function parseHighlights(raw: string): AboutHighlight[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts): parts is [string, string, string] => parts.length === 3)
    .map(([icon, title, description]) => ({ icon, title, description }));
}

export async function updateAbout(formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = aboutSchema.parse(Object.fromEntries(formData));

  const [current] = await db.select({ id: about.id }).from(about).limit(1);
  if (!current) {
    throw new Error("About row not found.");
  }

  await db
    .update(about)
    .set({
      bio: parsed.bio,
      missionQuote: parsed.missionQuote || null,
      highlights: parseHighlights(parsed.highlightsText),
    })
    .where(eq(about.id, current.id));

  await recordAuditLog({
    adminUserId: user.id,
    action: "about.update",
    targetType: "about",
    targetId: current.id,
  });
  await syncKnowledgeForEntity("ABOUT", current.id);
  revalidatePath("/admin/about");
  revalidatePath("/");
  redirect("/admin/about");
}

export async function getAboutForAdmin() {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  const [row] = await db.select().from(about).limit(1);
  return row ?? null;
}
