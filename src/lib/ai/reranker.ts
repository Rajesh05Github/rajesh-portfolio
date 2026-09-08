import { randomUUID } from "node:crypto";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { RAG_CONFIG } from "@/lib/config/rag";
import { recordUsage } from "./usage-tracking";

/**
 * Reranks hybrid-search candidates with a single structured-output call to a
 * small chat model, rather than a dedicated reranker service (Cohere Rerank,
 * etc.) — a conscious cost/ops tradeoff at this project's query volume, not
 * "the best possible reranker" (docs/rag.md §7).
 *
 * Candidates are referenced by array index in the prompt, not by their UUID
 * — asking a model to transcribe a UUID back correctly is a needless
 * failure mode; an index it just has to select is far more reliable, and we
 * map index -> real id ourselves after validating the response.
 *
 * Phase 11: `.withStructuredOutput(zodSchema)` (LangChain, confirmed to
 * support Zod v4 schemas directly — checked @langchain/core's dependency
 * range before relying on it) replaces the Phase 10 version's hand-built
 * OpenAI JSON-schema object plus manual `JSON.parse` + `.parse()` — the
 * request shape and response validation are now one call instead of three
 * hand-maintained pieces.
 *
 * Phase 14: `includeRaw: true` additionally surfaces `raw.usage_metadata`
 * (real token counts) for a `UsageRecord` row — `rerankChunks` returns the
 * token total alongside its results so the chat graph's `retrieve` node can
 * fold it into `ChatGraphState.totalTokensUsed` without re-deriving it.
 */

const rerankResponseSchema = z.object({
  scores: z.array(
    z.object({
      index: z.number().int().min(0),
      score: z.number().min(0).max(10),
    }),
  ),
});

function createStructuredModel(apiKey: string) {
  return new ChatOpenAI({
    apiKey,
    model: RAG_CONFIG.rerank.model,
  }).withStructuredOutput(rerankResponseSchema, { includeRaw: true });
}

let structuredModel: ReturnType<typeof createStructuredModel> | null = null;

function getStructuredModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set — copy .env.example to .env and add a real key to enable reranking.",
    );
  }
  structuredModel ??= createStructuredModel(apiKey);
  return structuredModel;
}

export type RerankCandidate = { id: string; content: string };
export type RerankResult = { id: string; score: number };
export type RerankOutcome = { results: RerankResult[]; usageTokens: number };

const CONTENT_PREVIEW_CHARS = 400;

function buildPrompt(query: string, candidates: RerankCandidate[]): string {
  const list = candidates
    .map((c, i) => `[${i}] ${c.content.slice(0, CONTENT_PREVIEW_CHARS)}`)
    .join("\n\n");
  return `Query: "${query}"\n\nCandidates:\n${list}\n\nScore each candidate's relevance to the query from 0 (irrelevant) to 10 (directly and completely answers the query). Every candidate index must appear exactly once in your response.`;
}

export async function rerankChunks(
  query: string,
  candidates: RerankCandidate[],
  context?: { requestId?: string; sessionId?: string },
): Promise<RerankOutcome> {
  if (candidates.length === 0) return { results: [], usageTokens: 0 };

  const model = getStructuredModel();
  const startedAt = Date.now();
  const { raw, parsed } = await model.invoke([
    {
      role: "system",
      content:
        "You are a relevance-scoring assistant for a portfolio chatbot's retrieval pipeline. You only score relevance — you never answer the query yourself.",
    },
    { role: "user", content: buildPrompt(query, candidates) },
  ]);

  const usage = raw instanceof AIMessage ? raw.usage_metadata : undefined;
  const { totalTokens } = await recordUsage({
    requestId: context?.requestId ?? randomUUID(),
    sessionId: context?.sessionId,
    operation: "RETRIEVAL_RERANK",
    model: RAG_CONFIG.rerank.model,
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    latencyMs: Date.now() - startedAt,
  });

  const results: RerankResult[] = [];
  for (const { index, score } of parsed.scores) {
    const candidate = candidates[index];
    if (candidate) results.push({ id: candidate.id, score });
  }
  return { results, usageTokens: totalTokens };
}
