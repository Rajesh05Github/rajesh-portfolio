import "server-only";
import { desc, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chatSession, usageRecord } from "@/lib/db/schema";

export type UsageRange = "today" | "week" | "month";

function rangeStart(range: UsageRange): Date {
  const now = new Date();
  if (range === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start;
  }
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return start;
}

export type UsageSummary = {
  totalRequests: number;
  totalTokens: number;
  estimatedCostUsd: number;
  avgLatencyMs: number;
};

/** Built entirely from real `UsageRecord` rows — no fabricated metrics (master prompt §97). Returns zeroes (not an error) when nothing has run yet in the range. */
export async function getUsageSummary(
  range: UsageRange,
): Promise<UsageSummary> {
  const [row] = await db
    .select({
      totalRequests: sql<number>`count(*)`,
      totalTokens: sql<number>`coalesce(sum(${usageRecord.totalTokens}), 0)`,
      estimatedCostUsd: sql<number>`coalesce(sum(${usageRecord.estimatedCostUsd}), 0)`,
      avgLatencyMs: sql<number>`coalesce(avg(${usageRecord.latencyMs}), 0)`,
    })
    .from(usageRecord)
    .where(gte(usageRecord.createdAt, rangeStart(range)));

  return {
    totalRequests: Number(row?.totalRequests ?? 0),
    totalTokens: Number(row?.totalTokens ?? 0),
    estimatedCostUsd: Number(row?.estimatedCostUsd ?? 0),
    avgLatencyMs: Number(row?.avgLatencyMs ?? 0),
  };
}

export type UsageByOperation = {
  operation: string;
  requests: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export async function getUsageByOperation(
  range: UsageRange,
): Promise<UsageByOperation[]> {
  const rows = await db
    .select({
      operation: usageRecord.operation,
      requests: sql<number>`count(*)`,
      totalTokens: sql<number>`coalesce(sum(${usageRecord.totalTokens}), 0)`,
      estimatedCostUsd: sql<number>`coalesce(sum(${usageRecord.estimatedCostUsd}), 0)`,
    })
    .from(usageRecord)
    .where(gte(usageRecord.createdAt, rangeStart(range)))
    .groupBy(usageRecord.operation)
    .orderBy(desc(sql`coalesce(sum(${usageRecord.totalTokens}), 0)`));

  return rows.map((row) => ({
    operation: row.operation,
    requests: Number(row.requests),
    totalTokens: Number(row.totalTokens),
    estimatedCostUsd: Number(row.estimatedCostUsd),
  }));
}

export type TopSession = {
  id: string;
  totalTokens: number;
  messageCount: number;
  status: string;
  lastActivityAt: Date;
};

/**
 * `ChatSession.totalTokens` is already a durable running total per session
 * (updated every turn — Phase 13/14), so this reads that directly rather
 * than re-deriving it with a `GROUP BY session_id` over `usage_record` —
 * one indexed query instead of an aggregation, same numbers.
 */
export async function getTopSessionsByTokens(
  limit = 10,
): Promise<TopSession[]> {
  const rows = await db
    .select()
    .from(chatSession)
    .where(gte(chatSession.totalTokens, 1))
    .orderBy(desc(chatSession.totalTokens))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    totalTokens: row.totalTokens,
    messageCount: row.messageCount,
    status: row.status,
    lastActivityAt: row.lastActivityAt,
  }));
}
