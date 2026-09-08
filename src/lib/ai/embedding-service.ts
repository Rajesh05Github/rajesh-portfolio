import { randomUUID } from "node:crypto";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MODELS } from "@/lib/config/models";
import { estimateTokenCount } from "./token-estimate";
import { recordUsage } from "./usage-tracking";

/**
 * The single call site for embedding generation (docs/rag.md §4) — no other
 * module talks to the OpenAI embeddings endpoint directly, and (Phase 11)
 * nothing outside this file knows LangChain is involved: the exported
 * `embedTexts` signature is unchanged from the Phase 9 hand-rolled version,
 * per ADR-0006's "LangChain confined to lib/ai/*" boundary.
 *
 * Swapping in `@langchain/openai`'s `OpenAIEmbeddings` here — rather than
 * keeping the raw `openai` SDK call — removed real code, not just moved it:
 * batching and retry/backoff on transient failures are both handled by the
 * base class (`maxRetries`, internal batching over `batchSize`), so the
 * hand-written retry loop and manual batch-splitting from Phase 9 are gone.
 */
export const EMBEDDING_MODEL = MODELS.embedding;
export const EMBEDDING_DIMENSIONS = 1536;

let embeddings: OpenAIEmbeddings | null = null;

function getEmbeddings(): OpenAIEmbeddings {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set — copy .env.example to .env and add a real key to enable embeddings.",
    );
  }
  embeddings ??= new OpenAIEmbeddings({
    apiKey,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    maxRetries: 3,
  });
  return embeddings;
}

export type EmbeddingResult = { embedding: number[]; tokenCount: number };

export async function embedTexts(texts: string[]): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return [];

  const tokenCounts = texts.map((t) => estimateTokenCount(t));
  const startedAt = Date.now();
  const vectors = await getEmbeddings().embedDocuments(texts);

  // LangChain's `OpenAIEmbeddings` doesn't surface the API's real per-call
  // token usage — this falls back to the same length-based estimate already
  // used for `KnowledgeChunk.tokenCount` (documented there as display-only,
  // not billing-accurate). Every other operation below records real usage.
  await recordUsage({
    requestId: randomUUID(),
    operation: "EMBEDDING",
    model: EMBEDDING_MODEL,
    inputTokens: tokenCounts.reduce((sum, n) => sum + n, 0),
    outputTokens: 0,
    latencyMs: Date.now() - startedAt,
  });

  return vectors.map((embedding, i) => ({
    embedding,
    tokenCount: tokenCounts[i]!,
  }));
}
