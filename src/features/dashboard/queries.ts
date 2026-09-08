import "server-only";
import { eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  skill,
  project,
  experience,
  chatSession,
  chatMessage,
  knowledgeDocument,
} from "@/lib/db/schema";

async function countRows(query: Promise<{ count: number }[]>): Promise<number> {
  const [row] = await query;
  return Number(row?.count ?? 0);
}

export type DashboardStats = {
  content: {
    publishedSkills: number;
    publishedProjects: number;
    publishedExperience: number;
  };
  visitors: {
    totalChatSessions: number;
    chatSessionsLast7Days: number;
    totalChatMessages: number;
  };
  knowledge: {
    indexed: number;
    pending: number;
    failed: number;
  };
};

/**
 * Every number here comes from a real row count — no placeholder/estimated
 * metric (master prompt §97). Deliberately separate from features/usage/
 * queries.ts (cost/token metrics) and features/security/queries.ts (abuse
 * events) rather than folded in here — the dashboard page composes all
 * three, but each stays owned by the feature it actually belongs to.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const countSql = sql<number>`count(*)`;

  const [
    publishedSkills,
    publishedProjects,
    publishedExperience,
    totalChatSessions,
    chatSessionsLast7Days,
    totalChatMessages,
    knowledgeCounts,
  ] = await Promise.all([
    countRows(
      db
        .select({ count: countSql })
        .from(skill)
        .where(eq(skill.status, "PUBLISHED")),
    ),
    countRows(
      db
        .select({ count: countSql })
        .from(project)
        .where(eq(project.status, "PUBLISHED")),
    ),
    countRows(
      db
        .select({ count: countSql })
        .from(experience)
        .where(eq(experience.status, "PUBLISHED")),
    ),
    countRows(db.select({ count: countSql }).from(chatSession)),
    countRows(
      db
        .select({ count: countSql })
        .from(chatSession)
        .where(gte(chatSession.createdAt, sevenDaysAgo)),
    ),
    countRows(db.select({ count: countSql }).from(chatMessage)),
    db
      .select({
        indexStatus: knowledgeDocument.indexStatus,
        count: countSql,
      })
      .from(knowledgeDocument)
      .groupBy(knowledgeDocument.indexStatus),
  ]);

  const byStatus = Object.fromEntries(
    knowledgeCounts.map((row) => [row.indexStatus, Number(row.count)]),
  );

  return {
    content: {
      publishedSkills,
      publishedProjects,
      publishedExperience,
    },
    visitors: {
      totalChatSessions,
      chatSessionsLast7Days,
      totalChatMessages,
    },
    knowledge: {
      indexed: byStatus.INDEXED ?? 0,
      pending: (byStatus.PENDING ?? 0) + (byStatus.INDEXING ?? 0),
      failed: byStatus.FAILED ?? 0,
    },
  };
}
