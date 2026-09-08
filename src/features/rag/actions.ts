"use server";

import { z } from "zod";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { buildContext, type BuiltContext } from "./context-builder";

const querySchema = z.string().min(1).max(500);

export type RagTestResult =
  { ok: true; context: BuiltContext } | { ok: false; error: string };

/**
 * Runs the real retrieval → rerank → context-builder pipeline for a
 * typed-in query — there's no chat UI yet (Phase 13) to exercise this any
 * other way, and this doubles as a genuine debugging tool once there is
 * one: "why didn't the bot find X" is answered by looking at these scores.
 */
export async function testRagQuery(query: string): Promise<RagTestResult> {
  await requirePermissionInAction(PERMISSIONS.AI_KNOWLEDGE_WRITE);

  const parsed = querySchema.safeParse(query);
  if (!parsed.success) {
    return { ok: false, error: "Query must be 1-500 characters." };
  }

  try {
    const context = await buildContext(parsed.data);
    return { ok: true, context };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unknown retrieval error.",
    };
  }
}
