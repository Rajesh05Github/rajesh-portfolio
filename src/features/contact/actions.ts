"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { contactMessage } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";

async function setContactMessageStatus(
  id: string,
  status: (typeof contactMessage.$inferSelect)["status"],
): Promise<void> {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);

  await db
    .update(contactMessage)
    .set({ status })
    .where(eq(contactMessage.id, id));

  await recordAuditLog({
    adminUserId: user.id,
    action: `contact_message.${status.toLowerCase()}`,
    targetType: "contact_message",
    targetId: id,
  });
  revalidatePath("/admin/contact");
}

export async function markContactMessageRead(id: string): Promise<void> {
  await setContactMessageStatus(id, "READ");
}

export async function archiveContactMessage(id: string): Promise<void> {
  await setContactMessageStatus(id, "ARCHIVED");
}
