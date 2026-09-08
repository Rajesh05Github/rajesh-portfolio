import "server-only";
import { desc, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { abuseEvent } from "@/lib/db/schema";

export type AbuseSummaryRow = { kind: string; count: number };

/** Built entirely from real `AbuseEvent` rows (master prompt §97) — since when the security page was last empty, the answer is "empty," not a placeholder. */
export async function getAbuseSummary(
  sinceHours: number,
): Promise<AbuseSummaryRow[]> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const rows = await db
    .select({ kind: abuseEvent.kind, count: sql<number>`count(*)` })
    .from(abuseEvent)
    .where(gte(abuseEvent.createdAt, since))
    .groupBy(abuseEvent.kind)
    .orderBy(desc(sql`count(*)`));

  return rows.map((row) => ({ kind: row.kind, count: Number(row.count) }));
}

export type RecentAbuseEvent = {
  id: string;
  sessionId: string | null;
  ipHash: string | null;
  kind: string;
  detail: string | null;
  createdAt: Date;
};

export async function listRecentAbuseEvents(
  limit = 50,
): Promise<RecentAbuseEvent[]> {
  const rows = await db
    .select()
    .from(abuseEvent)
    .orderBy(desc(abuseEvent.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    ipHash: row.ipHash,
    kind: row.kind,
    detail: row.detail,
    createdAt: row.createdAt,
  }));
}
