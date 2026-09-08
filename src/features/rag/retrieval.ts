import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { RAG_CONFIG } from "@/lib/config/rag";
import { embedTexts } from "@/lib/ai/embedding-service";

export type RetrievedChunk = {
  id: string;
  documentId: string;
  content: string;
  metadata: Record<string, unknown>;
  vectorScore: number;
  keywordScore: number;
  hybridScore: number;
};

type RetrievalRow = {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  vector_score: number;
  keyword_score: number;
  hybrid_score: number;
};

/** pgvector's driver expects a literal like "[0.1,0.2,...]" cast to ::vector — not a JS array binding. */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * Hybrid retrieval (docs/rag.md §6): vector cosine similarity (semantic
 * matches) + keyword ts_rank (exact-term matches neither alone catches
 * well), weighted per lib/config/rag.ts. Metadata filtering — published,
 * included-in-RAG, not soft-deleted — happens in the WHERE clause, before
 * scoring, not as an after-the-fact filter: this is also the RAG-poisoning
 * boundary (docs/security.md) — an excluded document is never a candidate
 * in the first place.
 */
export async function hybridSearch(
  queryText: string,
): Promise<RetrievedChunk[]> {
  const [{ embedding: queryEmbedding }] = await embedTexts([queryText]);
  const vectorLiteral = toVectorLiteral(queryEmbedding);
  const { vectorWeight, keywordWeight, candidateLimit } = RAG_CONFIG.retrieval;

  const rows = (await db.execute(sql`
    SELECT
      chunk.id AS id,
      chunk.document_id AS document_id,
      chunk.content AS content,
      chunk.metadata AS metadata,
      (1 - (chunk.embedding <=> ${vectorLiteral}::vector)) AS vector_score,
      COALESCE(ts_rank(chunk.content_tsv, plainto_tsquery('english', ${queryText})), 0) AS keyword_score,
      (
        ${vectorWeight} * (1 - (chunk.embedding <=> ${vectorLiteral}::vector))
        + ${keywordWeight} * COALESCE(ts_rank(chunk.content_tsv, plainto_tsquery('english', ${queryText})), 0)
      ) AS hybrid_score
    FROM knowledge_chunk chunk
    INNER JOIN knowledge_document doc ON doc.id = chunk.document_id
    WHERE doc.visibility = 'PUBLISHED'
      AND doc.include_in_rag = true
      AND doc.deleted_at IS NULL
      AND chunk.embedding IS NOT NULL
    ORDER BY hybrid_score DESC
    LIMIT ${candidateLimit}
  `)) as unknown as RetrievalRow[];

  return rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    content: row.content,
    metadata: row.metadata,
    vectorScore: Number(row.vector_score),
    keywordScore: Number(row.keyword_score),
    hybridScore: Number(row.hybrid_score),
  }));
}
