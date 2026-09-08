import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./_shared";

/** drizzle-orm has no built-in tsvector type — a generated column (docs/rag.md §6's keyword-search side) needs one. */
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/**
 * Every content entity that can contribute to the chatbot's knowledge gets
 * exactly one KnowledgeDocument (docs/database-design.md §4, master prompt
 * §17-18) — deliberately separate from the entity's own table, so "what's
 * shown publicly" and "what the chatbot knows" can diverge (an entity can
 * carry admin-authored extra context/FAQs that never render on the site).
 *
 * `sourceEntityId` is a loose reference (uuid, no DB foreign key) rather than
 * seven separate nullable FK columns — one column can point at a row in any
 * of the source tables, enforced at the application layer
 * (features/knowledge/actions.ts), not the database. CUSTOM/FAQ documents
 * (Phase 9+) have no owning row, hence nullable.
 */
export const knowledgeSourceType = pgEnum("knowledge_source_type", [
  "PROFILE",
  "ABOUT",
  "EXPERIENCE",
  "EDUCATION",
  "SKILL",
  "PROJECT",
  "CERTIFICATION",
  "ACHIEVEMENT",
  "RESUME",
  "FAQ",
  "CUSTOM",
]);

/**
 * Distinct from `includeInRag`: `includeInRag` is the admin's blanket
 * on/off switch for this entity ("should this ever be considered at all"),
 * while `visibility` is an editorial draft/publish state ("is the extra
 * context/FAQs I've written actually ready"). Retrieval (Phase 10) requires
 * includeInRag = true AND visibility = 'PUBLISHED' AND (once indexed)
 * indexStatus = 'INDEXED' — three independent gates, not one flag doing
 * three jobs.
 */
export const knowledgeVisibility = pgEnum("knowledge_visibility", [
  "DRAFT",
  "PUBLISHED",
]);

export const knowledgeIndexStatus = pgEnum("knowledge_index_status", [
  "PENDING",
  "INDEXING",
  "INDEXED",
  "FAILED",
]);

export type Faq = { question: string; answer: string };

export const knowledgeDocument = pgTable(
  "knowledge_document",
  {
    id: idColumn(),
    sourceType: knowledgeSourceType("source_type").notNull(),
    sourceEntityId: uuid("source_entity_id"),
    includeInRag: boolean("include_in_rag").notNull().default(true),
    additionalContext: text("additional_context"),
    faqs: jsonb("faqs").$type<Faq[]>().notNull().default([]),
    priority: integer("priority").notNull().default(0),
    visibility: knowledgeVisibility("visibility")
      .notNull()
      .default("PUBLISHED"),
    version: integer("version").notNull().default(1),
    indexStatus: knowledgeIndexStatus("index_status")
      .notNull()
      .default("PENDING"),
    lastIndexedAt: timestamp("last_indexed_at", { withTimezone: true }),
    chunkCount: integer("chunk_count").notNull().default(0),
    indexError: text("index_error"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestampColumns,
  },
  (table) => [
    index("knowledge_document_source_idx").on(
      table.sourceType,
      table.sourceEntityId,
    ),
  ],
);

export const knowledgeChunk = pgTable(
  "knowledge_chunk",
  {
    id: idColumn(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => knowledgeDocument.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    /** Generated + stored by Postgres itself from `content` — never written to directly (docs/rag.md §6, keyword side of hybrid retrieval). */
    contentTsv: tsvector("content_tsv").generatedAlwaysAs(
      sql`to_tsvector('english', "content")`,
    ),
    tokenCount: integer("token_count").notNull().default(0),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestampColumns.createdAt,
  },
  (table) => [
    index("knowledge_chunk_document_id_idx").on(table.documentId),
    // HNSW over IVFFlat: better recall/latency tradeoff and no separate "train"
    // step needed on a table this size (docs/database-design.md §8).
    index("knowledge_chunk_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("knowledge_chunk_content_tsv_idx").using("gin", table.contentTsv),
  ],
);

export type KnowledgeDocument = typeof knowledgeDocument.$inferSelect;
export type NewKnowledgeDocument = typeof knowledgeDocument.$inferInsert;
export type KnowledgeChunk = typeof knowledgeChunk.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeChunk.$inferInsert;
