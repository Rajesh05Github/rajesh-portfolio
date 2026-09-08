"use server";

import { headers } from "next/headers";
import { z } from "zod";
import type { ChatMessage } from "@/lib/db/schema";
import {
  createChatSession,
  getSessionMessages,
  hashIp,
  readSessionCookie,
  writeSessionCookie,
} from "./session";

const visitorInfoSchema = z.object({
  name: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(300).optional().or(z.literal("")),
  visitorType: z
    .enum([
      "RECRUITER",
      "HR",
      "DEVELOPER",
      "CLIENT",
      "POTENTIAL_CLIENT",
      "COMPANY",
      "STUDENT",
      "OTHER",
    ])
    .optional(),
  purpose: z.string().trim().max(500).optional(),
});

async function getClientIpHash(): Promise<string | undefined> {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip");
  return ip ? hashIp(ip) : undefined;
}

/**
 * Called once, when the widget's visitor-info gate is submitted (with real
 * info) or explicitly skipped (called with no args). Either way it starts a
 * fresh session and sets the cookie — `/api/chat` will lazily create an
 * anonymous session on its own if a visitor sends a message without ever
 * calling this (e.g. clicking a suggested question straight away).
 */
export async function startChatSession(
  visitorInfo?: z.infer<typeof visitorInfoSchema>,
): Promise<{ sessionId: string }> {
  const parsed = visitorInfo ? visitorInfoSchema.parse(visitorInfo) : undefined;
  const ipHash = await getClientIpHash();

  const session = await createChatSession(
    parsed && { ...parsed, email: parsed.email || undefined },
    ipHash,
  );
  await writeSessionCookie(session.id);
  return { sessionId: session.id };
}

export type ChatHistoryMessage = Pick<
  ChatMessage,
  "id" | "role" | "content" | "createdAt"
>;

/** Empty array (not an error) when there's no session yet — a brand new visitor. */
export async function getChatHistory(): Promise<ChatHistoryMessage[]> {
  const sessionId = await readSessionCookie();
  if (!sessionId) return [];

  const messages = await getSessionMessages(sessionId);
  return messages
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));
}
