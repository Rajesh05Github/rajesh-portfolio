import { hybridSearch, type RetrievedChunk } from "./retrieval";
import { rerankChunks } from "@/lib/ai/reranker";
import { RAG_CONFIG } from "@/lib/config/rag";

export type ScoredChunk = RetrievedChunk & { rerankScore: number };

export type BuiltContext = {
  /** Prompt-ready text, each chunk labeled with its source for citation/grounding-validation (docs/rag.md §8-9). */
  text: string;
  sources: { documentId: string; sourceType: string; title: string }[];
  chunkIds: string[];
  /** All reranked candidates, before the token-budget cut — surfaced for the admin RAG test tool and future evaluation runs (Phase 16), not just the final chunks used. */
  allScored: ScoredChunk[];
  /** Real tokens spent reranking this query — folded into the chat graph's `totalTokensUsed` accumulator (Phase 14, docs/token-cost-control.md §2). */
  usageTokens: number;
};

const EMPTY_CONTEXT: BuiltContext = {
  text: "",
  sources: [],
  chunkIds: [],
  allScored: [],
  usageTokens: 0,
};

/** Rough length-based estimate — no tokenizer wired up yet (same heuristic as lib/ai/embedding-service.ts). */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Retrieve -> rerank -> greedily pack under a token budget. Note on
 * "dedup chunks from both vector and keyword hits" (docs/rag.md §8): that
 * concern applied to a design running two separate searches and merging
 * results, where the same chunk could surface from each side. Our single
 * combined SQL query (features/rag/retrieval.ts) scores every chunk once,
 * so no such duplicate rows exist to collapse here.
 */
export async function buildContext(
  query: string,
  context?: { requestId?: string; sessionId?: string },
): Promise<BuiltContext> {
  const candidates = await hybridSearch(query);
  if (candidates.length === 0) return EMPTY_CONTEXT;

  const { results: rerankResults, usageTokens } = await rerankChunks(
    query,
    candidates.map((c) => ({ id: c.id, content: c.content })),
    context,
  );
  const rerankScoreById = new Map(rerankResults.map((r) => [r.id, r.score]));

  const scored: ScoredChunk[] = candidates
    .map((chunk) => ({
      ...chunk,
      rerankScore: rerankScoreById.get(chunk.id) ?? 0,
    }))
    .sort((a, b) => {
      if (b.rerankScore !== a.rerankScore) return b.rerankScore - a.rerankScore;
      const aPriority = Number(a.metadata.priority) || 0;
      const bPriority = Number(b.metadata.priority) || 0;
      return bPriority - aPriority;
    });

  const topCandidates = scored.slice(0, RAG_CONFIG.rerank.topK);

  let remainingBudget = RAG_CONFIG.context.maxContextTokens;
  const included: ScoredChunk[] = [];
  for (const chunk of topCandidates) {
    const chunkTokens = estimateTokens(chunk.content);
    if (included.length > 0 && chunkTokens > remainingBudget) break; // always include at least the top result
    included.push(chunk);
    remainingBudget -= chunkTokens;
    if (remainingBudget <= 0) break;
  }

  const text = included
    .map(
      (chunk) =>
        `[Source: ${String(chunk.metadata.sourceType ?? "unknown")} — ${String(chunk.metadata.title ?? "untitled")}]\n${chunk.content}`,
    )
    .join("\n\n");

  const sources = included.map((chunk) => ({
    documentId: chunk.documentId,
    sourceType: String(chunk.metadata.sourceType ?? "unknown"),
    title: String(chunk.metadata.title ?? "untitled"),
  }));

  return {
    text,
    sources,
    chunkIds: included.map((c) => c.id),
    allScored: scored,
    usageTokens,
  };
}
