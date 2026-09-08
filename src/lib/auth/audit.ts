import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

export async function recordAuditLog(entry: {
  adminUserId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  await db.insert(auditLog).values({
    adminUserId: entry.adminUserId ?? null,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    metadata: entry.metadata ?? {},
    ipAddress: entry.ipAddress ?? null,
  });
}
