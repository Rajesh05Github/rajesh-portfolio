import { cookies } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  chatMessage,
  chatSession,
  visitor,
  type ChatSession,
  type ChatMessage,
} from "@/lib/db/schema";
import {
  CHAT_SESSION_COOKIE_MAX_AGE_SECONDS,
  CHAT_SESSION_COOKIE_NAME,
} from "@/lib/config/limits";
import { hashIp } from "@/lib/security/hash-ip";
import type { ChatIntent } from "./graph/state";

/** @deprecated import hashIp from "@/lib/security/hash-ip" directly in new code — re-exported here only for existing callers. */
export { hashIp };

export type VisitorInfoInput = {
  name?: string;
  email?: string;
  visitorType?: (typeof visitor.$inferSelect)["visitorType"];
  purpose?: string;
};

/**
 * Creates a new session, optionally attaching a `Visitor` row when the
 * widget's info gate was filled in. Does not touch cookies itself — callers
 * (the Server Action, the route handler) decide when to set one.
 */
export async function createChatSession(
  visitorInfo: VisitorInfoInput | undefined,
  ipHash: string | undefined,
): Promise<ChatSession> {
  let visitorId: string | undefined;

  const hasVisitorInfo =
    visitorInfo &&
    (visitorInfo.name ||
      visitorInfo.email ||
      visitorInfo.visitorType ||
      visitorInfo.purpose);

  if (hasVisitorInfo) {
    const [row] = await db
      .insert(visitor)
      .values({
        name: visitorInfo.name || null,
        email: visitorInfo.email || null,
        visitorType: visitorInfo.visitorType,
        purpose: visitorInfo.purpose || null,
        consentGivenAt: new Date(),
        ipHash,
      })
      .returning();
    visitorId = row?.id;
  }

  const [session] = await db
    .insert(chatSession)
    .values({ visitorId })
    .returning();

  if (!session) {
    throw new Error("Failed to create chat session.");
  }
  return session;
}

export async function getChatSession(
  sessionId: string,
): Promise<ChatSession | null> {
  const [row] = await db
    .select()
    .from(chatSession)
    .where(eq(chatSession.id, sessionId))
    .limit(1);
  return row ?? null;
}

export async function touchChatSession(
  sessionId: string,
  delta: { messages: number; tokens: number },
): Promise<void> {
  const session = await getChatSession(sessionId);
  if (!session) return;

  await db
    .update(chatSession)
    .set({
      lastActivityAt: new Date(),
      messageCount: session.messageCount + delta.messages,
      totalTokens: session.totalTokens + delta.tokens,
    })
    .where(eq(chatSession.id, sessionId));
}

export async function appendChatMessage(input: {
  sessionId: string;
  role: (typeof chatMessage.$inferSelect)["role"];
  content: string;
  intent?: ChatIntent;
  retrievedChunkIds?: string[];
  requestId?: string;
}): Promise<void> {
  await db.insert(chatMessage).values({
    sessionId: input.sessionId,
    role: input.role,
    content: input.content,
    intent: input.intent,
    retrievedChunkIds: input.retrievedChunkIds,
    requestId: input.requestId,
  });
}

export async function getSessionMessages(
  sessionId: string,
): Promise<ChatMessage[]> {
  return db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.sessionId, sessionId))
    .orderBy(asc(chatMessage.createdAt));
}

/** Server Actions and Route Handlers may both write cookies via `next/headers` in the App Router. */
export async function readSessionCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CHAT_SESSION_COOKIE_NAME)?.value;
}

export async function writeSessionCookie(sessionId: string): Promise<void> {
  const store = await cookies();
  store.set(CHAT_SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CHAT_SESSION_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}

/**
 * Reuses the cookie's session if it still resolves to a real, non-blocked
 * row; otherwise creates a fresh one lazily (no visitor info) — the widget
 * doesn't have to complete a round-trip to `startChatSession` before its
 * very first message can be sent (e.g. after clicking "Skip" or a suggested
 * question with no gate interaction at all).
 */
export async function getOrCreateActiveSession(
  ipHash: string | undefined,
): Promise<ChatSession> {
  const existingId = await readSessionCookie();
  if (existingId) {
    const existing = await getChatSession(existingId);
    if (existing && existing.status === "ACTIVE") {
      return existing;
    }
  }

  const session = await createChatSession(undefined, ipHash);
  await writeSessionCookie(session.id);
  return session;
}
