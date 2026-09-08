import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  chatSession,
  chatMessage,
  visitor,
  type ChatMessage,
} from "@/lib/db/schema";

export type ChatSessionSummary = {
  id: string;
  status: string;
  messageCount: number;
  totalTokens: number;
  lastActivityAt: Date;
  createdAt: Date;
  visitorName: string | null;
  visitorEmail: string | null;
};

const sessionSummaryColumns = {
  id: chatSession.id,
  status: chatSession.status,
  messageCount: chatSession.messageCount,
  totalTokens: chatSession.totalTokens,
  lastActivityAt: chatSession.lastActivityAt,
  createdAt: chatSession.createdAt,
  visitorName: visitor.name,
  visitorEmail: visitor.email,
};

/** Newest-activity-first, like the security dashboard's recent-events list — this is a read-only transcript log, not something an admin edits, so no pagination beyond a generous limit. */
export async function listRecentChatSessions(
  limit = 50,
): Promise<ChatSessionSummary[]> {
  return db
    .select(sessionSummaryColumns)
    .from(chatSession)
    .leftJoin(visitor, eq(chatSession.visitorId, visitor.id))
    .orderBy(desc(chatSession.lastActivityAt))
    .limit(limit);
}

export async function getChatSessionDetail(sessionId: string): Promise<{
  session: ChatSessionSummary | null;
  messages: ChatMessage[];
}> {
  const [session] = await db
    .select(sessionSummaryColumns)
    .from(chatSession)
    .leftJoin(visitor, eq(chatSession.visitorId, visitor.id))
    .where(eq(chatSession.id, sessionId))
    .limit(1);

  if (!session) return { session: null, messages: [] };

  const messages = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.sessionId, sessionId))
    .orderBy(chatMessage.createdAt);

  return { session, messages };
}
