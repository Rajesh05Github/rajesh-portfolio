import { db } from "@/lib/db/client";
import { usageRecord } from "@/lib/db/schema";
import { estimateCostUsd } from "./cost";

/**
 * No `import "server-only"` — called from `embedding-service.ts`, which the
 * standalone BullMQ worker also imports (docs/architecture.md's `server-only`
 * gotcha, hit for real in Phase 9).
 */
export type UsageOperation =
  | "INTENT_CLASSIFICATION"
  | "RETRIEVAL_RERANK"
  | "GENERATION"
  | "EMBEDDING"
  | "EVALUATION_JUDGE";

export type RecordUsageInput = {
  requestId: string;
  sessionId?: string;
  operation: UsageOperation;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

/**
 * The one write path for `UsageRecord` (docs/token-cost-control.md §4) —
 * every real OpenAI call, chat completion or embedding, produces exactly one
 * row here. Returns `totalTokens` so callers can feed it into the chat
 * graph's own running `totalTokensUsed` accumulator without recomputing it.
 */
export async function recordUsage(
  input: RecordUsageInput,
): Promise<{ totalTokens: number }> {
  const totalTokens = input.inputTokens + input.outputTokens;
  const estimatedCostUsd = estimateCostUsd(
    input.model,
    input.inputTokens,
    input.outputTokens,
  );

  await db.insert(usageRecord).values({
    requestId: input.requestId,
    sessionId: input.sessionId,
    operation: input.operation,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    totalTokens,
    estimatedCostUsd: estimatedCostUsd.toFixed(8),
    latencyMs: input.latencyMs,
  });

  return { totalTokens };
}
