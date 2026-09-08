"use server";

import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { education } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { computeReorderSwap } from "@/lib/db/reorder";
import {
  syncKnowledgeForEntity,
  retireKnowledgeForEntity,
} from "@/features/knowledge/sync";

const educationSchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(200),
  field: z.string().max(200),
  startDate: z.string().date(),
  endDate: z.string().date().or(z.literal("")),
  description: z.string().max(5000),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

async function nextDisplayOrder(): Promise<number> {
  const rows = await db
    .select({ displayOrder: education.displayOrder })
    .from(education)
    .orderBy(asc(education.displayOrder));
  return rows.length === 0
    ? 0
    : Math.max(...rows.map((r) => r.displayOrder)) + 1;
}

export async function createEducation(formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = educationSchema.parse(Object.fromEntries(formData));

  const [row] = await db
    .insert(education)
    .values({
      institution: parsed.institution,
      degree: parsed.degree,
      field: parsed.field || null,
      startDate: new Date(parsed.startDate),
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      description: parsed.description || null,
      status: parsed.status,
      displayOrder: await nextDisplayOrder(),
    })
    .returning();

  await recordAuditLog({
    adminUserId: user.id,
    action: "education.create",
    targetType: "education",
    targetId: row?.id,
  });
  if (row) await syncKnowledgeForEntity("EDUCATION", row.id);
  revalidatePath("/admin/education");
  revalidatePath("/");
  redirect("/admin/education");
}

export async function updateEducation(id: string, formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = educationSchema.parse(Object.fromEntries(formData));

  await db
    .update(education)
    .set({
      institution: parsed.institution,
      degree: parsed.degree,
      field: parsed.field || null,
      startDate: new Date(parsed.startDate),
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      description: parsed.description || null,
      status: parsed.status,
    })
    .where(eq(education.id, id));

  await recordAuditLog({
    adminUserId: user.id,
    action: "education.update",
    targetType: "education",
    targetId: id,
  });
  await syncKnowledgeForEntity("EDUCATION", id);
  revalidatePath("/admin/education");
  revalidatePath("/");
  redirect("/admin/education");
}

export async function deleteEducation(id: string) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  await db
    .update(education)
    .set({ deletedAt: new Date() })
    .where(eq(education.id, id));
  await recordAuditLog({
    adminUserId: user.id,
    action: "education.delete",
    targetType: "education",
    targetId: id,
  });
  await retireKnowledgeForEntity("EDUCATION", id);
  revalidatePath("/admin/education");
  revalidatePath("/");
}

export async function moveEducation(direction: "up" | "down", id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);

  const items = await db
    .select({ id: education.id, displayOrder: education.displayOrder })
    .from(education)
    .where(isNull(education.deletedAt))
    .orderBy(asc(education.displayOrder));

  const swap = computeReorderSwap(items, id, direction);
  if (!swap) return;
  const [a, b] = swap;

  await db.transaction(async (tx) => {
    await tx
      .update(education)
      .set({ displayOrder: b.displayOrder })
      .where(eq(education.id, a.id));
    await tx
      .update(education)
      .set({ displayOrder: a.displayOrder })
      .where(eq(education.id, b.id));
  });

  revalidatePath("/admin/education");
  revalidatePath("/");
}

export async function listEducation() {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  return db
    .select()
    .from(education)
    .where(isNull(education.deletedAt))
    .orderBy(asc(education.displayOrder));
}

export async function getEducationById(id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  const [row] = await db
    .select()
    .from(education)
    .where(and(eq(education.id, id), isNull(education.deletedAt)))
    .limit(1);
  return row ?? null;
}
