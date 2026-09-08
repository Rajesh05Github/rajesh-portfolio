# RAG Architecture

## 1. Pipeline overview

```
Admin content change → KnowledgeDocument stale → BullMQ job
  → Extraction → Cleaning/Normalization → Metadata enrichment → Chunking → Embedding → Indexing (pgvector upsert)

Visitor query → Chat API → LangGraph → Retrieve (hybrid) → Rerank → Context Builder → OpenAI → Grounding validation → Response
```

## 2. Ingestion

**Sources** (per master prompt §21): Profile, About, Experience, Education, Skill, Project (+ its FAQs/additional context), Certification, Achievement, Resume (PDF text extraction), admin-authored custom `KnowledgeDocument` rows (sourceType `CUSTOM`/`FAQ`).

**Extraction**: each `sourceType` has a small extractor function in `features/rag/extractors/*` that turns the entity's public fields **plus** its `additionalContext`/`faqs` (from the linked `KnowledgeDocument`) into plain text with a title. PDF (resume) extraction uses `pdf-parse` (or LangChain's PDF loader) at ingestion time — the raw text is stored, not the PDF itself, in `KnowledgeChunk`.

**Cleaning/normalization**: strip markup artifacts, collapse whitespace, normalize headings — a single `normalizeText()` utility shared by all extractors so chunk boundaries aren't thrown off by inconsistent formatting.

**Metadata enrichment**: every chunk carries `{documentId, sourceType, sourceEntityId, section, title, contentType, priority, version, createdAt, updatedAt}` (per master prompt §22) — this is what lets the context builder attribute an answer back to "this came from the E-Commerce Platform project" and lets retrieval filter by `visibility = PUBLISHED` before anything reaches the LLM.

## 3. Chunking strategy

Not a blind fixed-character split. Strategy per `sourceType`:
- **Structured/short entities** (Experience, Education, Certification, Achievement, Skill): one chunk per entity — these are already a natural semantic unit (a single job, a single degree) and are short enough (a few hundred tokens) to never need splitting. Splitting them would only fragment context for no retrieval benefit.
- **Project**: one chunk for the core description, and a separate chunk per FAQ entry (each FAQ is its own retrievable unit — a visitor asking "did this project use Redis?" should hit the FAQ chunk that answers exactly that, not a diluted mega-chunk).
- **Long free text** (About bio, Resume, CUSTOM knowledge): a recursive character/markdown-aware splitter (LangChain's `RecursiveCharacterTextSplitter`) with a target chunk size (~500 tokens) and overlap (~50 tokens), splitting on paragraph/sentence boundaries before falling back to raw character count — semantic boundaries first, fixed size only as the last resort.

Every chunk is tagged with its parent document's full metadata so retrieval always knows where it came from, independent of chunking strategy.

## 4. Embeddings

`EmbeddingService` (`lib/ai/embedding-service.ts`) is the single call site for all embedding generation — no other module calls the OpenAI embeddings endpoint directly.

- Model: `text-embedding-3-small` (1536 dims) — a "large" embedding model is not justified at this corpus size/quality bar; configurable via `lib/config` if a stronger model is ever warranted.
- Batching: chunks from one document are embedded in a single batched API call (up to the provider's batch/token limit), not one request per chunk.
- Retries: exponential backoff on transient failures (429/5xx), capped attempts; permanent failures mark the `KnowledgeDocument.indexStatus = FAILED` with `indexError` set, visible on the admin knowledge dashboard, not silently swallowed.
- Token limits: input is truncated/re-chunked if a single chunk would exceed the embedding model's token limit (shouldn't happen given chunk sizing above, but guarded).
- Versioning: `KnowledgeChunk` rows are tied to `KnowledgeDocument.version` — re-indexing a document deletes its old chunks and inserts new ones in one transaction (no orphaned stale vectors).
- Cost awareness: embedding calls are recorded the same way chat completions are (see [token-cost-control.md](token-cost-control.md)) — indexing cost is visible on the same cost dashboard, not invisible background spend.

## 5. Vector storage

`pgvector` in the primary Postgres instance (see [ADR-0003](decisions/0003-postgres-pgvector.md)). `KnowledgeChunk.embedding vector(1536)`, HNSW index with cosine distance ops.

## 6. Hybrid retrieval

```sql
-- conceptual shape, not literal final SQL
SELECT chunk.*,
       (1 - (chunk.embedding <=> :queryEmbedding)) AS vector_score,
       ts_rank(chunk.content_tsv, plainto_tsquery(:query)) AS keyword_score
FROM knowledge_chunk chunk
JOIN knowledge_document doc ON doc.id = chunk.document_id
WHERE doc.visibility = 'PUBLISHED' AND doc.include_in_rag = true AND doc.deleted_at IS NULL
ORDER BY (0.7 * vector_score + 0.3 * keyword_score) DESC
LIMIT 30
```

Vector search catches semantic matches ("what backend tech does he use" → chunks about Node/Postgres even without those exact words); keyword search catches exact-term lookups (a specific technology name, a company name) vector search can under-rank. Weights (0.7/0.3) live in `lib/config`, not hardcoded — tunable during evaluation (§8 below).

**Metadata filtering is applied in the `WHERE` clause, before scoring** — an unpublished or `includeInRag = false` document is never a retrieval candidate, not filtered out after the fact (this is also the RAG-poisoning boundary, see [security.md](security.md)).

## 7. Reranking

Top ~30 hybrid candidates → reranker → top 5-8 passed to the context builder.

**Decision**: rather than adding a dedicated reranker service (e.g., Cohere Rerank — another paid API, another vendor), rerank with a single cheap structured-output call to the same small OpenAI model already in use: given the query and the 30 candidate chunk summaries, the model returns a relevance score (0-10) per chunk id (Zod-validated array output). This is justified purely by cost/ops simplicity at this project's query volume — documented as a conscious tradeoff, not "the best possible reranker."

## 8. Context builder

`features/rag/context-builder.ts`:
- Deduplicates chunks (same `sourceEntityId` appearing via both vector and keyword hits collapses to one).
- Sorts by rerank score, then `KnowledgeDocument.priority` as tiebreak.
- Greedily includes chunks until a configured token budget (`lib/config.rag.maxContextTokens`) is reached — never sends all 30 candidates verbatim.
- Preserves per-chunk source metadata in the prompt (e.g. `[Source: Project — E-Commerce Platform]`) so the LLM can cite what it's grounding on and the validation step (§9) can check the answer against the same metadata.

## 9. Answer grounding & validation

System prompt (versioned, see [security.md](security.md) prompt-versioning) instructs the model to answer **only** from the provided context and to say `"I don't have enough information in my portfolio knowledge to answer that accurately."` when the context doesn't cover the question (master prompt §29, §106). A lightweight post-generation check flags answers that reference entities/technologies not present anywhere in the supplied context chunks — flagged responses are logged (not silently blocked) and feed the evaluation hallucination-rate metric.

## 10. LangGraph flow

See [architecture.md §5](architecture.md) and [ADR-0006](decisions/0006-langchain-langgraph.md) for the full graph. RAG only runs for the `PORTFOLIO_QUESTION` route — general/abuse routes never touch retrieval, saving cost and staying scoped (master prompt §89-90).

## 11. Caching

Retrieval results and full answers for frequently-asked, non-personalized questions are cached in Redis (key: normalized-query hash, TTL configurable) — invalidated whenever a `KnowledgeDocument` is re-indexed, so a stale cached answer can't outlive the content it was grounded on.
