# ADR-0003: PostgreSQL + pgvector for vector storage (no dedicated vector DB)

## Problem
The RAG pipeline needs vector similarity search over knowledge chunks, combined with keyword/full-text search and metadata filtering (visibility, source type, entity ownership) — at portfolio scale (hundreds to low thousands of chunks, not millions).

## Options
1. PostgreSQL with the `pgvector` extension, alongside the existing relational schema.
2. A dedicated vector database (Pinecone, Weaviate, Qdrant, Milvus).
3. In-memory/embedded vector store (e.g., a local file-based index) with no persistence guarantees.

## Decision
PostgreSQL + `pgvector`, in the same database instance as all other durable content.

## Why
- Scale: this system will index low thousands of chunks at most (portfolio content + a resume + admin-authored knowledge). `pgvector`'s IVFFlat/HNSW indexes comfortably handle that; the scale that would justify a dedicated vector DB (tens of millions of vectors, dedicated horizontal scaling) doesn't apply here.
- Metadata filtering (`visibility = 'published'`, `sourceType = 'project'`, `entityId = ...`) is a native SQL `WHERE` clause alongside the vector operator — no need to sync filters between two systems.
- Hybrid retrieval (vector + keyword) is a single query joining a `tsvector` full-text column and a `vector` column in the same table — a dedicated vector DB would require a second system (e.g., Postgres for keyword + Pinecone for vectors) and a merge step in application code, which is strictly more operational complexity for no retrieval-quality benefit at this scale.
- One database to back up, migrate, and reason about transactionally — a knowledge row and its embedding are written in the same transaction, so there's no possibility of them going out of sync.
- Directly demonstrates a skill listed in the brief (pgvector) without adding an extra managed service/cost.

## Tradeoffs
- `pgvector` HNSW/IVFFlat is not as fast as purpose-built ANN engines at very large scale — irrelevant at this project's scale, called out explicitly so it isn't mistaken for "solved at any scale."
- If the project ever needed cross-region vector replication or 10M+ vectors, this decision would need revisiting — documented here so a future maintainer knows why, and what would trigger a change.
