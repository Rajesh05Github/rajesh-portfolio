import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  appendChatMessage,
  createChatSession,
  getChatSession,
  getSessionMessages,
  hashIp,
  touchChatSession,
} from "@/features/chatbot/session";
import { resetDb } from "../helpers/reset-db";

// `readSessionCookie`/`writeSessionCookie`/`getOrCreateActiveSession` call
// `cookies()` from `next/headers`, which only works inside a real Next.js
// request — they're exercised live instead (Playwright e2e, and manual
// verification during Phases 13-17). What's tested here is everything
// else: the DB-only functions a Route Handler or Server Action calls once
// it already has a session id in hand.

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await resetDb();
});

describe("hashIp", () => {
  it("is deterministic and never returns the raw ip", () => {
    const hash = hashIp("203.0.113.1");
    expect(hash).not.toBe("203.0.113.1");
    expect(hashIp("203.0.113.1")).toBe(hash);
  });

  it("produces different hashes for different ips", () => {
    expect(hashIp("203.0.113.1")).not.toBe(hashIp("203.0.113.2"));
  });
});

describe("createChatSession", () => {
  it("creates an anonymous session with no visitor when no info is given", async () => {
    const session = await createChatSession(undefined, hashIp("203.0.113.1"));
    expect(session.visitorId).toBeNull();
    expect(session.status).toBe("ACTIVE");
  });

  it("creates a linked Visitor row when info is given", async () => {
    const session = await createChatSession(
      { name: "Ada Lovelace", visitorType: "RECRUITER" },
      hashIp("203.0.113.1"),
    );
    expect(session.visitorId).not.toBeNull();
  });

  it("does not create a Visitor row when info is given but every field is empty", async () => {
    const session = await createChatSession({}, hashIp("203.0.113.1"));
    expect(session.visitorId).toBeNull();
  });
});

describe("touchChatSession", () => {
  it("accumulates message count and token totals across calls", async () => {
    const session = await createChatSession(undefined, undefined);

    await touchChatSession(session.id, { messages: 2, tokens: 100 });
    await touchChatSession(session.id, { messages: 2, tokens: 250 });

    const updated = await getChatSession(session.id);
    expect(updated?.messageCount).toBe(4);
    expect(updated?.totalTokens).toBe(350);
  });

  it("is a no-op for a session id that does not exist", async () => {
    // Must not throw — the caller doesn't need to special-case a missing session.
    await expect(
      touchChatSession("00000000-0000-0000-0000-000000000000", {
        messages: 1,
        tokens: 1,
      }),
    ).resolves.not.toThrow();
  });
});

describe("appendChatMessage / getSessionMessages", () => {
  it("returns messages for a session in chronological order", async () => {
    const session = await createChatSession(undefined, undefined);

    await appendChatMessage({
      sessionId: session.id,
      role: "VISITOR",
      content: "Hello",
    });
    await appendChatMessage({
      sessionId: session.id,
      role: "ASSISTANT",
      content: "Hi there",
    });

    const messages = await getSessionMessages(session.id);
    expect(messages.map((m) => m.content)).toEqual(["Hello", "Hi there"]);
    expect(messages.map((m) => m.role)).toEqual(["VISITOR", "ASSISTANT"]);
  });

  it("only returns messages for the requested session, not another one", async () => {
    const sessionA = await createChatSession(undefined, undefined);
    const sessionB = await createChatSession(undefined, undefined);

    await appendChatMessage({
      sessionId: sessionA.id,
      role: "VISITOR",
      content: "From A",
    });
    await appendChatMessage({
      sessionId: sessionB.id,
      role: "VISITOR",
      content: "From B",
    });

    const messagesA = await getSessionMessages(sessionA.id);
    expect(messagesA).toHaveLength(1);
    expect(messagesA[0]?.content).toBe("From A");
  });
});
