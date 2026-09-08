"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { resume } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { storage } from "@/lib/storage";

function revalidateResumeRoutes() {
  revalidatePath("/admin/resume");
  revalidatePath("/"); // Hero's "Download CV" button depends on whether an active resume exists
}

export async function listResumes() {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  return db.select().from(resume).orderBy(desc(resume.uploadedAt));
}

export async function activateResume(id: string) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);

  await db.transaction(async (tx) => {
    await tx
      .update(resume)
      .set({ isActive: false })
      .where(eq(resume.isActive, true));
    await tx.update(resume).set({ isActive: true }).where(eq(resume.id, id));
  });

  await recordAuditLog({
    adminUserId: user.id,
    action: "resume.activate",
    targetType: "resume",
    targetId: id,
  });
  revalidateResumeRoutes();
}

/** Hard delete (no soft-delete field on this table — an old resume file has no reason to be recoverable once removed) — also deletes the underlying stored file. */
export async function deleteResume(id: string) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);

  const [row] = await db
    .select()
    .from(resume)
    .where(eq(resume.id, id))
    .limit(1);
  if (!row) return;

  await db.delete(resume).where(eq(resume.id, id));
  await storage.delete(row.fileUrl);

  await recordAuditLog({
    adminUserId: user.id,
    action: "resume.delete",
    targetType: "resume",
    targetId: id,
  });
  revalidateResumeRoutes();
}
