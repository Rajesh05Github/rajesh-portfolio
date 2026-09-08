ALTER TABLE "knowledge_chunk" ADD COLUMN "content_tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED;--> statement-breakpoint
CREATE INDEX "knowledge_chunk_embedding_idx" ON "knowledge_chunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "knowledge_chunk_content_tsv_idx" ON "knowledge_chunk" USING gin ("content_tsv");