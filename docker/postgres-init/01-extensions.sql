-- Enabled once, at container init, on the app database.
-- pgvector: vector column + similarity search for KnowledgeChunk embeddings (docs/decisions/0003-postgres-pgvector.md).
-- pg_trgm: fuzzy/ILIKE search used by admin list-view filters (docs/database-design.md).
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
