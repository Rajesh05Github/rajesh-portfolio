import { MODELS } from "./models";

/**
 * Retrieval/reranking/context tuning — centralized so evaluation (Phase 16)
 * can vary these and compare runs, and so nothing here is a magic number
 * buried in a query file (docs/rag.md §6-8, master prompt §74).
 */
export const RAG_CONFIG = {
  retrieval: {
    /** Vector vs. keyword weight in the hybrid score — tunable, not fixed by the query's shape. */
    vectorWeight: 0.7,
    keywordWeight: 0.3,
    /** Hybrid candidates pulled before reranking. */
    candidateLimit: 30,
  },
  rerank: {
    /** Chunks kept after reranking, before context budgeting. */
    topK: 8,
    model: MODELS.rerank,
  },
  context: {
    /** Rough token budget for the assembled context passed to the LLM (Phase 12+) — ~4 chars/token heuristic, no tokenizer wired up yet. */
    maxContextTokens: 2000,
  },
} as const;
