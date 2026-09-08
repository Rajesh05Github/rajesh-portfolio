import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chatMessage, usageRecord } from "@/lib/db/schema";

export type RequestTrace = {
  messages: (typeof chatMessage.$inferSelect)[];
  usage: (typeof usageRecord.$inferSelect)[];
};

/**
 * Every `UsageRecord` and `ChatMessage` row carries the `requestId` that's
 * been threaded through the chat graph since Phase 12 — this is the
 * practical payoff of that threading: given one id, see everything a
 * single chat turn did and cost, without grepping server logs.
 *
 * `AbuseEvent` (Phase 15) is deliberately not joined here — it's
 * correlated by session/IP, not `requestId`, since a rejected request at
 * the rate-limit/token-budget layer never reaches a point where a
 * `requestId` even exists yet (docs/observability.md).
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guards against a malformed id reaching the database as a raw query param — Postgres would otherwise reject it with an "invalid input syntax for type uuid" error instead of a clean empty result. */
export async function getRequestTrace(
  requestId: string,
): Promise<RequestTrace> {
  if (!UUID_PATTERN.test(requestId)) {
    return { messages: [], usage: [] };
  }

  const [messages, usage] = await Promise.all([
    db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.requestId, requestId))
      .orderBy(chatMessage.createdAt),
    db
      .select()
      .from(usageRecord)
      .where(eq(usageRecord.requestId, requestId))
      .orderBy(usageRecord.createdAt),
  ]);
  return { messages, usage };
}
