"use server";

import { z } from "zod";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { runChatGraph, type ChatGraphResult } from "./graph";

const querySchema = z.string().min(1).max(2000);

export type ChatTestResult =
  { ok: true; result: ChatGraphResult } | { ok: false; error: string };

/**
 * Admin-only trace tool for the LangGraph chat pipeline — mirrors
 * `features/rag/actions.ts#testRagQuery`. There's no public chat UI yet
 * (Phase 13), so this is the only way to exercise intent classification,
 * retrieval, tool calls, and the grounding check end-to-end.
 */
export async function testChatGraph(query: string): Promise<ChatTestResult> {
  await requirePermissionInAction(PERMISSIONS.AI_KNOWLEDGE_WRITE);

  const parsed = querySchema.safeParse(query);
  if (!parsed.success) {
    return { ok: false, error: "Message must be 1-2000 characters." };
  }

  try {
    const result = await runChatGraph(parsed.data);
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unknown chat graph error.",
    };
  }
}
