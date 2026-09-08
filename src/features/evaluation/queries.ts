import "server-only";
import { avg, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  evaluationCase,
  evaluationDataset,
  evaluationResult,
  evaluationRun,
} from "@/lib/db/schema";

export async function listDatasets() {
  return db
    .select()
    .from(evaluationDataset)
    .orderBy(desc(evaluationDataset.createdAt));
}

export async function getDataset(datasetId: string) {
  const [dataset] = await db
    .select()
    .from(evaluationDataset)
    .where(eq(evaluationDataset.id, datasetId))
    .limit(1);
  return dataset ?? null;
}

export async function listCasesForDataset(datasetId: string) {
  return db
    .select()
    .from(evaluationCase)
    .where(eq(evaluationCase.datasetId, datasetId))
    .orderBy(evaluationCase.createdAt);
}

export async function listRunsForDataset(datasetId: string) {
  return db
    .select()
    .from(evaluationRun)
    .where(eq(evaluationRun.datasetId, datasetId))
    .orderBy(desc(evaluationRun.startedAt));
}

export type RunSummary = {
  caseCount: number;
  avgRetrievalRelevance: number;
  avgContextRecall: number;
  avgAnswerRelevance: number;
  avgFaithfulness: number;
  avgAnswerCorrectness: number;
  hallucinationRate: number;
};

/** Built entirely from real `EvaluationResult` rows for this run (master prompt §97) — zeroes, not fabricated placeholder numbers, when a run has no results yet (e.g. still RUNNING). */
export async function getRunSummary(runId: string): Promise<RunSummary> {
  const [row] = await db
    .select({
      caseCount: count(),
      avgRetrievalRelevance: avg(evaluationResult.retrievalRelevance),
      avgContextRecall: avg(evaluationResult.contextRecall),
      avgAnswerRelevance: avg(evaluationResult.answerRelevance),
      avgFaithfulness: avg(evaluationResult.faithfulness),
      avgAnswerCorrectness: avg(evaluationResult.answerCorrectness),
      hallucinationRate: sql<number>`coalesce(avg(${evaluationResult.hallucinated}::int), 0)`,
    })
    .from(evaluationResult)
    .where(eq(evaluationResult.runId, runId));

  return {
    caseCount: Number(row?.caseCount ?? 0),
    avgRetrievalRelevance: Number(row?.avgRetrievalRelevance ?? 0),
    avgContextRecall: Number(row?.avgContextRecall ?? 0),
    avgAnswerRelevance: Number(row?.avgAnswerRelevance ?? 0),
    avgFaithfulness: Number(row?.avgFaithfulness ?? 0),
    avgAnswerCorrectness: Number(row?.avgAnswerCorrectness ?? 0),
    hallucinationRate: Number(row?.hallucinationRate ?? 0),
  };
}

export type ResultWithCase = {
  id: string;
  question: string;
  expectedAnswer: string | null;
  actualAnswer: string;
  retrievalRelevance: number;
  contextRecall: number;
  answerRelevance: number;
  faithfulness: number;
  answerCorrectness: number;
  hallucinated: boolean;
  notes: string | null;
};

export async function getRunResults(runId: string): Promise<ResultWithCase[]> {
  const rows = await db
    .select({
      id: evaluationResult.id,
      question: evaluationCase.question,
      expectedAnswer: evaluationCase.expectedAnswer,
      actualAnswer: evaluationResult.actualAnswer,
      retrievalRelevance: evaluationResult.retrievalRelevance,
      contextRecall: evaluationResult.contextRecall,
      answerRelevance: evaluationResult.answerRelevance,
      faithfulness: evaluationResult.faithfulness,
      answerCorrectness: evaluationResult.answerCorrectness,
      hallucinated: evaluationResult.hallucinated,
      notes: evaluationResult.notes,
    })
    .from(evaluationResult)
    .innerJoin(evaluationCase, eq(evaluationResult.caseId, evaluationCase.id))
    .where(eq(evaluationResult.runId, runId))
    .orderBy(evaluationResult.createdAt);

  return rows;
}

export async function getRun(runId: string) {
  const [run] = await db
    .select()
    .from(evaluationRun)
    .where(eq(evaluationRun.id, runId))
    .limit(1);
  return run ?? null;
}
