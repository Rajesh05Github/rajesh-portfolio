"use server";

import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { certification } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { computeReorderSwap } from "@/lib/db/reorder";
import {
  syncKnowledgeForEntity,
  retireKnowledgeForEntity,
} from "@/features/knowledge/sync";

const certificationSchema = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  issueDate: z.string().date(),
  expiryDate: z.string().date().or(z.literal("")),
  credentialUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

async function nextDisplayOrder(): Promise<number> {
  const rows = await db
    .select({ displayOrder: certification.displayOrder })
    .from(certification)
    .orderBy(asc(certification.displayOrder));
  return rows.length === 0
    ? 0
    : Math.max(...rows.map((r) => r.displayOrder)) + 1;
}

export async function createCertification(formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = certificationSchema.parse(Object.fromEntries(formData));

  const [row] = await db
    .insert(certification)
    .values({
      name: parsed.name,
      issuer: parsed.issuer,
      issueDate: new Date(parsed.issueDate),
      expiryDate: parsed.expiryDate ? new Date(parsed.expiryDate) : null,
      credentialUrl: parsed.credentialUrl ? parsed.credentialUrl : null,
      status: parsed.status,
      displayOrder: await nextDisplayOrder(),
    })
    .returning();

  await recordAuditLog({
    adminUserId: user.id,
    action: "certification.create",
    targetType: "certification",
    targetId: row?.id,
  });
  if (row) await syncKnowledgeForEntity("CERTIFICATION", row.id);
  revalidatePath("/admin/certifications");
  revalidatePath("/");
  redirect("/admin/certifications");
}

export async function updateCertification(id: string, formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = certificationSchema.parse(Object.fromEntries(formData));

  await db
    .update(certification)
    .set({
      name: parsed.name,
      issuer: parsed.issuer,
      issueDate: new Date(parsed.issueDate),
      expiryDate: parsed.expiryDate ? new Date(parsed.expiryDate) : null,
      credentialUrl: parsed.credentialUrl ? parsed.credentialUrl : null,
      status: parsed.status,
    })
    .where(eq(certification.id, id));

  await recordAuditLog({
    adminUserId: user.id,
    action: "certification.update",
    targetType: "certification",
    targetId: id,
  });
  await syncKnowledgeForEntity("CERTIFICATION", id);
  revalidatePath("/admin/certifications");
  revalidatePath("/");
  redirect("/admin/certifications");
}

export async function deleteCertification(id: string) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  await db
    .update(certification)
    .set({ deletedAt: new Date() })
    .where(eq(certification.id, id));
  await recordAuditLog({
    adminUserId: user.id,
    action: "certification.delete",
    targetType: "certification",
    targetId: id,
  });
  await retireKnowledgeForEntity("CERTIFICATION", id);
  revalidatePath("/admin/certifications");
  revalidatePath("/");
}

export async function moveCertification(direction: "up" | "down", id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);

  const items = await db
    .select({ id: certification.id, displayOrder: certification.displayOrder })
    .from(certification)
    .where(isNull(certification.deletedAt))
    .orderBy(asc(certification.displayOrder));

  const swap = computeReorderSwap(items, id, direction);
  if (!swap) return;
  const [a, b] = swap;

  await db.transaction(async (tx) => {
    await tx
      .update(certification)
      .set({ displayOrder: b.displayOrder })
      .where(eq(certification.id, a.id));
    await tx
      .update(certification)
      .set({ displayOrder: a.displayOrder })
      .where(eq(certification.id, b.id));
  });

  revalidatePath("/admin/certifications");
  revalidatePath("/");
}

export async function listCertifications() {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  return db
    .select()
    .from(certification)
    .where(isNull(certification.deletedAt))
    .orderBy(asc(certification.displayOrder));
}

export async function getCertificationById(id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  const [row] = await db
    .select()
    .from(certification)
    .where(and(eq(certification.id, id), isNull(certification.deletedAt)))
    .limit(1);
  return row ?? null;
}
