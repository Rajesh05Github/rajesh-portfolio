import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contactMessage, type ContactMessage } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";

export async function listContactMessages(): Promise<ContactMessage[]> {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  return db
    .select()
    .from(contactMessage)
    .orderBy(desc(contactMessage.createdAt));
}

/** Drives the sidebar's unread badge — archived messages don't count as "unread" even if never opened, since archiving is itself a form of "I've dealt with this." */
export async function getNewContactMessageCount(): Promise<number> {
  const rows = await db
    .select({ id: contactMessage.id })
    .from(contactMessage)
    .where(eq(contactMessage.status, "NEW"));
  return rows.length;
}
