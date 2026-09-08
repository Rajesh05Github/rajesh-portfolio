"use server";

import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { experience } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { computeReorderSwap } from "@/lib/db/reorder";
import {
  syncKnowledgeForEntity,
  retireKnowledgeForEntity,
} from "@/features/knowledge/sync";

const experienceSchema = z.object({
  role: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  startDate: z.string().date(),
  endDate: z.string().date().or(z.literal("")),
  description: z.string().min(1).max(5000),
  technologies: z.string().max(2000), // comma-separated in the form, split below
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

function parseTechnologies(raw: string): string[] {
  return raw
    .split(",")
    .map((tech) => tech.trim())
    .filter(Boolean);
}

async function nextDisplayOrder(): Promise<number> {
  const rows = await db
    .select({ displayOrder: experience.displayOrder })
    .from(experience)
    .orderBy(asc(experience.displayOrder));
  return rows.length === 0
    ? 0
    : Math.max(...rows.map((r) => r.displayOrder)) + 1;
}

export async function createExperience(formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = experienceSchema.parse(Object.fromEntries(formData));

  const [row] = await db
    .insert(experience)
    .values({
      role: parsed.role,
      company: parsed.company,
      startDate: new Date(parsed.startDate),
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      description: parsed.description,
      technologies: parseTechnologies(parsed.technologies),
      status: parsed.status,
      displayOrder: await nextDisplayOrder(),
    })
    .returning();

  await recordAuditLog({
    adminUserId: user.id,
    action: "experience.create",
    targetType: "experience",
    targetId: row?.id,
  });
  if (row) await syncKnowledgeForEntity("EXPERIENCE", row.id);
  revalidatePath("/admin/experience");
  revalidatePath("/");
  redirect("/admin/experience");
}

export async function updateExperience(id: string, formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = experienceSchema.parse(Object.fromEntries(formData));

  await db
    .update(experience)
    .set({
      role: parsed.role,
      company: parsed.company,
      startDate: new Date(parsed.startDate),
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      description: parsed.description,
      technologies: parseTechnologies(parsed.technologies),
      status: parsed.status,
    })
    .where(eq(experience.id, id));

  await recordAuditLog({
    adminUserId: user.id,
    action: "experience.update",
    targetType: "experience",
    targetId: id,
  });
  await syncKnowledgeForEntity("EXPERIENCE", id);
  revalidatePath("/admin/experience");
  revalidatePath("/");
  redirect("/admin/experience");
}

export async function deleteExperience(id: string) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  await db
    .update(experience)
    .set({ deletedAt: new Date() })
    .where(eq(experience.id, id));
  await recordAuditLog({
    adminUserId: user.id,
    action: "experience.delete",
    targetType: "experience",
    targetId: id,
  });
  await retireKnowledgeForEntity("EXPERIENCE", id);
  revalidatePath("/admin/experience");
  revalidatePath("/");
}

export async function moveExperience(direction: "up" | "down", id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);

  const items = await db
    .select({ id: experience.id, displayOrder: experience.displayOrder })
    .from(experience)
    .where(isNull(experience.deletedAt))
    .orderBy(asc(experience.displayOrder));

  const swap = computeReorderSwap(items, id, direction);
  if (!swap) return;
  const [a, b] = swap;

  await db.transaction(async (tx) => {
    await tx
      .update(experience)
      .set({ displayOrder: b.displayOrder })
      .where(eq(experience.id, a.id));
    await tx
      .update(experience)
      .set({ displayOrder: a.displayOrder })
      .where(eq(experience.id, b.id));
  });

  revalidatePath("/admin/experience");
  revalidatePath("/");
}

export async function listExperience() {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  return db
    .select()
    .from(experience)
    .where(isNull(experience.deletedAt))
    .orderBy(asc(experience.displayOrder));
}

export async function getExperienceById(id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  const [row] = await db
    .select()
    .from(experience)
    .where(and(eq(experience.id, id), isNull(experience.deletedAt)))
    .limit(1);
  return row ?? null;
}
