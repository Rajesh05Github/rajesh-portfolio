import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  knowledgeChunk,
  knowledgeDocument,
  type KnowledgeDocument,
} from "@/lib/db/schema";
import { enqueueKnowledgeIndexing } from "@/lib/queue/knowledge-indexing-queue";

/**
 * The "automatic knowledge synchronization" from master prompt §19 — called
 * from every content-entity's create/update Server Action (not just the
 * dedicated AI Knowledge tab from Phase 8), so editing an Experience row's
 * own description re-indexes it exactly like changing its FAQs would.
 * Get-or-creates the document (an entity created before this phase's worker
 * existed still gets one the first time it's saved), bumps its version, and
 * enqueues a background re-index — the caller never waits on embedding.
 */
export async function syncKnowledgeForEntity(
  sourceType: KnowledgeDocument["sourceType"],
  sourceEntityId: string,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(knowledgeDocument)
    .where(
      and(
        eq(knowledgeDocument.sourceType, sourceType),
        eq(knowledgeDocument.sourceEntityId, sourceEntityId),
        isNull(knowledgeDocument.deletedAt),
      ),
    )
    .limit(1);

  let documentId: string | undefined = existing?.id;

  if (!existing) {
    const [created] = await db
      .insert(knowledgeDocument)
      .values({ sourceType, sourceEntityId })
      .returning();
    documentId = created?.id;
  } else {
    await db
      .update(knowledgeDocument)
      .set({ indexStatus: "PENDING", version: existing.version + 1 })
      .where(eq(knowledgeDocument.id, existing.id));
  }

  if (documentId) await enqueueKnowledgeIndexing(documentId);
}

/** Called from delete actions — removes the document's chunks immediately and soft-deletes the document itself, so a deleted entity can't linger as retrievable knowledge. */
export async function retireKnowledgeForEntity(
  sourceType: KnowledgeDocument["sourceType"],
  sourceEntityId: string,
): Promise<void> {
  const [doc] = await db
    .select()
    .from(knowledgeDocument)
    .where(
      and(
        eq(knowledgeDocument.sourceType, sourceType),
        eq(knowledgeDocument.sourceEntityId, sourceEntityId),
      ),
    )
    .limit(1);
  if (!doc) return;

  await db.delete(knowledgeChunk).where(eq(knowledgeChunk.documentId, doc.id));
  await db
    .update(knowledgeDocument)
    .set({ deletedAt: new Date() })
    .where(eq(knowledgeDocument.id, doc.id));
}
