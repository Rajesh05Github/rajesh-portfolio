import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  evaluationCase,
  evaluationDataset,
  evaluationResult,
  evaluationRun,
  type EvaluationCase,
} from "@/lib/db/schema";
import { runChatGraph } from "@/features/chatbot/graph";
import { judgeChatTurn } from "@/lib/ai/judge";
import { RAG_CONFIG } from "@/lib/config/rag";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { MODELS } from "@/lib/config/models";

/** Vacuous 1.0 (not a penalty) when there's nothing to check against — a case with no `expectedSources` isn't testing recall, and a case where the judge found zero chunks worth scoring (often an out-of-scope case that correctly retrieved nothing) shouldn't be marked "irrelevant." */
function computeContextRecall(
  retrievedSourceEntityIds: Set<string>,
  expectedSources: string[],
): number {
  if (expectedSources.length === 0) return 1;
  const found = expectedSources.filter((id) =>
    retrievedSourceEntityIds.has(id),
  ).length;
  return found / expectedSources.length;
}

async function evaluateCase(
  runId: string,
  evalCase: EvaluationCase,
): Promise<void> {
  const requestId = randomUUID();

  // No sessionId — an evaluation run is not a real visitor conversation
  // (same convention as the admin `/admin/ai/chat-test` tool: UsageRecord/
  // ChatSession stay decoupled from evaluation traffic).
  const graphResult = await runChatGraph(evalCase.question);

  const context = graphResult.retrievedContext;
  const includedChunks = context
    ? context.allScored.filter((c) => context.chunkIds.includes(c.id))
    : [];

  const verdict = await judgeChatTurn({
    question: evalCase.question,
    expectedAnswer: evalCase.expectedAnswer,
    actualAnswer: graphResult.answer,
    retrievedChunks: includedChunks.map((c) => ({ content: c.content })),
    requestId,
  });

  const retrievedSourceEntityIds = new Set(
    includedChunks
      .map((c) => String(c.metadata.sourceEntityId ?? ""))
      .filter((id) => id.length > 0),
  );
  const contextRecall = computeContextRecall(
    retrievedSourceEntityIds,
    evalCase.expectedSources,
  );
  const retrievalRelevance =
    verdict.retrievalRelevance.length > 0
      ? verdict.retrievalRelevance.filter((r) => r.relevant).length /
        verdict.retrievalRelevance.length
      : 1;

  await db.insert(evaluationResult).values({
    runId,
    caseId: evalCase.id,
    actualAnswer: graphResult.answer,
    retrievalRelevance,
    contextRecall,
    answerRelevance: verdict.answerRelevance / 10,
    faithfulness: verdict.faithful ? 1 : 0,
    answerCorrectness: verdict.answerCorrectness / 10,
    hallucinated: !verdict.faithful,
    notes:
      verdict.unsupportedClaims.length > 0
        ? `Unsupported claims: ${verdict.unsupportedClaims.join("; ")}`
        : null,
  });
}

/**
 * Runs the real chat graph against every case in a dataset, judges each
 * turn, and records one `EvaluationResult` row per case (docs/evaluation.md
 * §2). A failure partway through marks the run FAILED but leaves whatever
 * `EvaluationResult` rows already landed in place — a deliberate simplicity
 * choice over per-case retry/skip logic, which isn't justified for a v1
 * admin-triggered runner (docs/evaluation.md §7).
 */
export async function runEvaluation(
  datasetId: string,
): Promise<{ runId: string }> {
  const [dataset] = await db
    .select()
    .from(evaluationDataset)
    .where(eq(evaluationDataset.id, datasetId))
    .limit(1);
  if (!dataset) {
    throw new Error("Evaluation dataset not found.");
  }

  const cases = await db
    .select()
    .from(evaluationCase)
    .where(eq(evaluationCase.datasetId, datasetId));
  if (cases.length === 0) {
    throw new Error("This dataset has no cases to evaluate.");
  }

  const [run] = await db
    .insert(evaluationRun)
    .values({
      datasetId,
      model: MODELS.generation,
      promptVersion: CHAT_SYSTEM_PROMPT.version,
      retrievalConfig: RAG_CONFIG,
      status: "RUNNING",
    })
    .returning();
  if (!run) {
    throw new Error("Failed to create evaluation run.");
  }

  try {
    for (const evalCase of cases) {
      await evaluateCase(run.id, evalCase);
    }
    await db
      .update(evaluationRun)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(evaluationRun.id, run.id));
  } catch (error) {
    await db
      .update(evaluationRun)
      .set({ status: "FAILED", completedAt: new Date() })
      .where(eq(evaluationRun.id, run.id));
    throw error;
  }

  return { runId: run.id };
}
