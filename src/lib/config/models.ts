/**
 * Single source of truth for which OpenAI model backs which operation
 * (docs/token-cost-control.md §3, master prompt §41) — every call site
 * (`lib/config/chat.ts`, `lib/config/rag.ts`, `lib/ai/embedding-service.ts`)
 * references this instead of inlining a model string, so upgrading one
 * operation's model is a one-line change here, and `lib/config/pricing.ts`
 * has a single closed set of model names to price.
 *
 * All three chat-adjacent operations default to the same small model —
 * splitting to a bigger model for generation only happens if evaluation
 * (Phase 16) shows a real quality gap, not preemptively.
 */
export const MODELS = {
  intentClassification: "gpt-4o-mini",
  rerank: "gpt-4o-mini",
  generation: "gpt-4o-mini",
  embedding: "text-embedding-3-small",
  /** Deliberately the same small model as generation, not a bigger "judge" model — a judge that costs more per call than the thing it's judging isn't justified yet at this project's scale (Phase 16). */
  evaluationJudge: "gpt-4o-mini",
} as const;

export type ModelName = (typeof MODELS)[keyof typeof MODELS];
