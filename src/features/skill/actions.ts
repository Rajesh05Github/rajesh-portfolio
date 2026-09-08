"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { skill } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { computeReorderSwap } from "@/lib/db/reorder";
import {
  syncKnowledgeForEntity,
  retireKnowledgeForEntity,
} from "@/features/knowledge/sync";

const skillSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum([
    "LANGUAGE",
    "FRAMEWORK",
    "DATABASE",
    "TOOL",
    "PLATFORM",
    "SOFT_SKILL",
  ]),
  proficiency: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : val),
    z.coerce.number().int().min(1).max(5).optional(),
  ),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

async function nextDisplayOrder(): Promise<number> {
  const rows = await db
    .select({ displayOrder: skill.displayOrder })
    .from(skill)
    .orderBy(asc(skill.displayOrder));
  return rows.length === 0
    ? 0
    : Math.max(...rows.map((r) => r.displayOrder)) + 1;
}

export async function createSkill(formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = skillSchema.parse(Object.fromEntries(formData));

  const [row] = await db
    .insert(skill)
    .values({
      name: parsed.name,
      category: parsed.category,
      proficiency: parsed.proficiency ?? null,
      status: parsed.status,
      displayOrder: await nextDisplayOrder(),
    })
    .returning();

  await recordAuditLog({
    adminUserId: user.id,
    action: "skill.create",
    targetType: "skill",
    targetId: row?.id,
  });
  if (row) await syncKnowledgeForEntity("SKILL", row.id);
  revalidatePath("/admin/skills");
  revalidatePath("/");
  redirect("/admin/skills");
}

export async function updateSkill(id: string, formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = skillSchema.parse(Object.fromEntries(formData));

  await db
    .update(skill)
    .set({
      name: parsed.name,
      category: parsed.category,
      proficiency: parsed.proficiency ?? null,
      status: parsed.status,
    })
    .where(eq(skill.id, id));

  await recordAuditLog({
    adminUserId: user.id,
    action: "skill.update",
    targetType: "skill",
    targetId: id,
  });
  await syncKnowledgeForEntity("SKILL", id);
  revalidatePath("/admin/skills");
  revalidatePath("/");
  redirect("/admin/skills");
}

export async function deleteSkill(id: string) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  // Skill has no soft-delete column — this is a real, permanent delete.
  await db.delete(skill).where(eq(skill.id, id));
  await recordAuditLog({
    adminUserId: user.id,
    action: "skill.delete",
    targetType: "skill",
    targetId: id,
  });
  await retireKnowledgeForEntity("SKILL", id);
  revalidatePath("/admin/skills");
  revalidatePath("/");
}

export async function moveSkill(direction: "up" | "down", id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);

  const items = await db
    .select({ id: skill.id, displayOrder: skill.displayOrder })
    .from(skill)
    .orderBy(asc(skill.displayOrder));

  const swap = computeReorderSwap(items, id, direction);
  if (!swap) return;
  const [a, b] = swap;

  await db.transaction(async (tx) => {
    await tx
      .update(skill)
      .set({ displayOrder: b.displayOrder })
      .where(eq(skill.id, a.id));
    await tx
      .update(skill)
      .set({ displayOrder: a.displayOrder })
      .where(eq(skill.id, b.id));
  });

  revalidatePath("/admin/skills");
  revalidatePath("/");
}

export async function listSkills() {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  return db.select().from(skill).orderBy(asc(skill.displayOrder));
}

export async function getSkillById(id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  const [row] = await db.select().from(skill).where(eq(skill.id, id)).limit(1);
  return row ?? null;
}
