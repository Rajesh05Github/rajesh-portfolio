import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { knowledgeChunk, knowledgeDocument } from "@/lib/db/schema";
import { extractDocument } from "./extractors";
import { embedTexts } from "@/lib/ai/embedding-service";

/**
 * Runs entirely inside the worker process (src/workers/knowledge-indexing-
 * worker.ts), never inline in a request handler — embedding a document can
 * take seconds and the admin/visitor should never wait on it (docs/
 * architecture.md §6, master prompt §19).
 *
 * Re-indexing a document deletes its old chunks and inserts new ones in one
 * transaction (docs/rag.md §4) — no window where stale and fresh chunks
 * coexist, no orphaned vectors left behind by a partial failure.
 */
export async function indexKnowledgeDocument(
  documentId: string,
): Promise<void> {
  await db
    .update(knowledgeDocument)
    .set({ indexStatus: "INDEXING" })
    .where(eq(knowledgeDocument.id, documentId));

  try {
    const [doc] = await db
      .select()
      .from(knowledgeDocument)
      .where(eq(knowledgeDocument.id, documentId))
      .limit(1);
    if (!doc) throw new Error("Knowledge document no longer exists.");

    if (!doc.includeInRag || doc.visibility !== "PUBLISHED") {
      // Not an error — deliberately excluded from the knowledge base. Clear any
      // previously-indexed chunks so a toggled-off document can't still be retrieved.
      await db.transaction(async (tx) => {
        await tx
          .delete(knowledgeChunk)
          .where(eq(knowledgeChunk.documentId, documentId));
        await tx
          .update(knowledgeDocument)
          .set({
            indexStatus: "INDEXED",
            chunkCount: 0,
            lastIndexedAt: new Date(),
            indexError: null,
          })
          .where(eq(knowledgeDocument.id, documentId));
      });
      return;
    }

    const extracted = await extractDocument(doc);
    if (!extracted || extracted.chunks.length === 0) {
      await db.transaction(async (tx) => {
        await tx
          .delete(knowledgeChunk)
          .where(eq(knowledgeChunk.documentId, documentId));
        await tx
          .update(knowledgeDocument)
          .set({
            indexStatus: "INDEXED",
            chunkCount: 0,
            lastIndexedAt: new Date(),
            indexError: null,
          })
          .where(eq(knowledgeDocument.id, documentId));
      });
      return;
    }

    const embeddings = await embedTexts(
      extracted.chunks.map((chunk) => chunk.content),
    );

    await db.transaction(async (tx) => {
      await tx
        .delete(knowledgeChunk)
        .where(eq(knowledgeChunk.documentId, documentId));
      await tx.insert(knowledgeChunk).values(
        extracted.chunks.map((chunk, i) => ({
          documentId,
          content: chunk.content,
          embedding: embeddings[i]!.embedding,
          tokenCount: embeddings[i]!.tokenCount,
          metadata: chunk.metadata,
        })),
      );
      await tx
        .update(knowledgeDocument)
        .set({
          indexStatus: "INDEXED",
          chunkCount: extracted.chunks.length,
          lastIndexedAt: new Date(),
          indexError: null,
        })
        .where(eq(knowledgeDocument.id, documentId));
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown indexing error.";
    await db
      .update(knowledgeDocument)
      .set({ indexStatus: "FAILED", indexError: message })
      .where(eq(knowledgeDocument.id, documentId));
    throw error; // re-throw so BullMQ counts this as a failed job attempt and retries per its backoff config
  }
}
