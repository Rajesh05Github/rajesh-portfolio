import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./_shared";

export const evaluationRunStatus = pgEnum("evaluation_run_status", [
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);

/** A named, versioned collection of `EvaluationCase`s (docs/evaluation.md §3) — versioned so an `EvaluationRun` can record exactly which revision of the question set it ran against. */
export const evaluationDataset = pgTable("evaluation_dataset", {
  id: idColumn(),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: timestampColumns.createdAt,
});

/**
 * `expectedAnswer` is nullable — an adversarial/injection case's "correct"
 * behavior is the graph's own canned rejection, not a specific sentence to
 * match; the judge is told explicitly when no reference answer exists
 * (`lib/ai/judge.ts`). `expectedSources` holds `KnowledgeChunk.metadata.sourceEntityId`
 * values (real entity ids, e.g. a specific Project's id) — used for the
 * context-recall calculation, a plain set-overlap check, not an LLM judgment.
 */
export const evaluationCase = pgTable(
  "evaluation_case",
  {
    id: idColumn(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => evaluationDataset.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    expectedAnswer: text("expected_answer"),
    expectedSources: jsonb("expected_sources")
      .$type<string[]>()
      .notNull()
      .default([]),
    createdAt: timestampColumns.createdAt,
  },
  (table) => [index("evaluation_case_dataset_id_idx").on(table.datasetId)],
);

/**
 * Freezes exactly what was evaluated (docs/evaluation.md §5) — model,
 * chat system prompt version, and a snapshot of `RAG_CONFIG` at run time —
 * so a later run can be diffed against this one to see what changed and
 * whether it helped.
 */
export const evaluationRun = pgTable(
  "evaluation_run",
  {
    id: idColumn(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => evaluationDataset.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    promptVersion: integer("prompt_version").notNull(),
    retrievalConfig: jsonb("retrieval_config")
      .$type<Record<string, unknown>>()
      .notNull(),
    status: evaluationRunStatus("status").notNull().default("RUNNING"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestampColumns.createdAt,
  },
  (table) => [index("evaluation_run_dataset_id_idx").on(table.datasetId)],
);

/**
 * Per-case scores for one run (docs/evaluation.md §4). All five score
 * columns are normalized to a 0-1 fraction for consistent averaging across
 * a run: `retrievalRelevance`/`contextRecall` are plain fractions,
 * `answerRelevance`/`answerCorrectness` are the judge's 0-10 score divided
 * by 10, `faithfulness` is 1.0/0.0 (the judge's boolean verdict) rather than
 * a fraction today — a per-claim-supported fraction is a natural future
 * refinement, not needed to make hallucination rate meaningful right now.
 * `hallucinated` is simply the inverse of `faithfulness`, kept as its own
 * column because docs/database-design.md §7 names it explicitly and a
 * dashboard computing "hallucination rate" reads more naturally as
 * `AVG(hallucinated::int)` than `AVG(1 - faithfulness)`.
 */
export const evaluationResult = pgTable(
  "evaluation_result",
  {
    id: idColumn(),
    runId: uuid("run_id")
      .notNull()
      .references(() => evaluationRun.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => evaluationCase.id, { onDelete: "cascade" }),
    actualAnswer: text("actual_answer").notNull(),
    retrievalRelevance: real("retrieval_relevance").notNull(),
    contextRecall: real("context_recall").notNull(),
    answerRelevance: real("answer_relevance").notNull(),
    faithfulness: real("faithfulness").notNull(),
    answerCorrectness: real("answer_correctness").notNull(),
    hallucinated: boolean("hallucinated").notNull(),
    notes: text("notes"),
    createdAt: timestampColumns.createdAt,
  },
  (table) => [
    index("evaluation_result_run_id_idx").on(table.runId),
    index("evaluation_result_case_id_idx").on(table.caseId),
  ],
);

export type EvaluationDataset = typeof evaluationDataset.$inferSelect;
export type NewEvaluationDataset = typeof evaluationDataset.$inferInsert;
export type EvaluationCase = typeof evaluationCase.$inferSelect;
export type NewEvaluationCase = typeof evaluationCase.$inferInsert;
export type EvaluationRun = typeof evaluationRun.$inferSelect;
export type NewEvaluationRun = typeof evaluationRun.$inferInsert;
export type EvaluationResult = typeof evaluationResult.$inferSelect;
export type NewEvaluationResult = typeof evaluationResult.$inferInsert;
