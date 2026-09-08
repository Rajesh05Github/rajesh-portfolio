import {
  BaseRetriever,
  type BaseRetrieverInput,
} from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import { buildContext } from "@/features/rag/context-builder";

/**
 * Wraps the Phase 9-10 retrieve→rerank→context-budget pipeline
 * (features/rag/context-builder.ts) behind LangChain's standard
 * `BaseRetriever` interface — so Phase 12's LangGraph nodes can consume it
 * via `.invoke(query)` like any other LangChain retriever, instead of the
 * graph needing to know our pipeline's specific function shape.
 *
 * This is the one place `features/rag/*` gets wrapped *for* LangChain
 * (rather than LangChain living inside `features/rag/*`) — the domain
 * pipeline itself still contains no LangChain imports (ADR-0006).
 */
export class PortfolioKnowledgeRetriever extends BaseRetriever {
  lc_namespace = ["advportfolio", "rag"];

  constructor(fields?: BaseRetrieverInput) {
    super(fields);
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const context = await buildContext(query);
    const includedIds = new Set(context.chunkIds);

    return context.allScored
      .filter((chunk) => includedIds.has(chunk.id))
      .map(
        (chunk) =>
          new Document({
            pageContent: chunk.content,
            metadata: {
              ...chunk.metadata,
              chunkId: chunk.id,
              documentId: chunk.documentId,
              vectorScore: chunk.vectorScore,
              keywordScore: chunk.keywordScore,
              hybridScore: chunk.hybridScore,
              rerankScore: chunk.rerankScore,
            },
          }),
      );
  }
}
