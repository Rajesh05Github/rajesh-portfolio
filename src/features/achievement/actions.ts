"use server";

import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { achievement } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { computeReorderSwap } from "@/lib/db/reorder";
import {
  syncKnowledgeForEntity,
  retireKnowledgeForEntity,
} from "@/features/knowledge/sync";

const achievementSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).or(z.literal("")),
  date: z.string().date(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

async function nextDisplayOrder(): Promise<number> {
  const rows = await db
    .select({ displayOrder: achievement.displayOrder })
    .from(achievement)
    .orderBy(asc(achievement.displayOrder));
  return rows.length === 0
    ? 0
    : Math.max(...rows.map((r) => r.displayOrder)) + 1;
}

export async function createAchievement(formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = achievementSchema.parse(Object.fromEntries(formData));

  const [row] = await db
    .insert(achievement)
    .values({
      title: parsed.title,
      description: parsed.description ? parsed.description : null,
      date: new Date(parsed.date),
      status: parsed.status,
      displayOrder: await nextDisplayOrder(),
    })
    .returning();

  await recordAuditLog({
    adminUserId: user.id,
    action: "achievement.create",
    targetType: "achievement",
    targetId: row?.id,
  });
  if (row) await syncKnowledgeForEntity("ACHIEVEMENT", row.id);
  revalidatePath("/admin/achievements");
  revalidatePath("/");
  redirect("/admin/achievements");
}

export async function updateAchievement(id: string, formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = achievementSchema.parse(Object.fromEntries(formData));

  await db
    .update(achievement)
    .set({
      title: parsed.title,
      description: parsed.description ? parsed.description : null,
      date: new Date(parsed.date),
      status: parsed.status,
    })
    .where(eq(achievement.id, id));

  await recordAuditLog({
    adminUserId: user.id,
    action: "achievement.update",
    targetType: "achievement",
    targetId: id,
  });
  await syncKnowledgeForEntity("ACHIEVEMENT", id);
  revalidatePath("/admin/achievements");
  revalidatePath("/");
  redirect("/admin/achievements");
}

export async function deleteAchievement(id: string) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  await db
    .update(achievement)
    .set({ deletedAt: new Date() })
    .where(eq(achievement.id, id));
  await recordAuditLog({
    adminUserId: user.id,
    action: "achievement.delete",
    targetType: "achievement",
    targetId: id,
  });
  await retireKnowledgeForEntity("ACHIEVEMENT", id);
  revalidatePath("/admin/achievements");
  revalidatePath("/");
}

export async function moveAchievement(direction: "up" | "down", id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);

  const items = await db
    .select({ id: achievement.id, displayOrder: achievement.displayOrder })
    .from(achievement)
    .where(isNull(achievement.deletedAt))
    .orderBy(asc(achievement.displayOrder));

  const swap = computeReorderSwap(items, id, direction);
  if (!swap) return;
  const [a, b] = swap;

  await db.transaction(async (tx) => {
    await tx
      .update(achievement)
      .set({ displayOrder: b.displayOrder })
      .where(eq(achievement.id, a.id));
    await tx
      .update(achievement)
      .set({ displayOrder: a.displayOrder })
      .where(eq(achievement.id, b.id));
  });

  revalidatePath("/admin/achievements");
  revalidatePath("/");
}

export async function listAchievements() {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  return db
    .select()
    .from(achievement)
    .where(isNull(achievement.deletedAt))
    .orderBy(asc(achievement.displayOrder));
}

export async function getAchievementById(id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  const [row] = await db
    .select()
    .from(achievement)
    .where(and(eq(achievement.id, id), isNull(achievement.deletedAt)))
    .limit(1);
  return row ?? null;
}
