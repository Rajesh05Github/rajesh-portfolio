import { buildContext } from "@/features/rag/context-builder";
import type { ChatGraphState } from "../state";

/**
 * Calls `buildContext` directly rather than going through the LangChain
 * `PortfolioKnowledgeRetriever` (Phase 11) — the graph needs the full
 * `BuiltContext` shape (including `allScored`/`chunkIds`, exposed for admin
 * debugging) rather than a `Document[]` translation. The retriever remains
 * the standards-compliant integration point for any future LangChain-native
 * consumer; both wrap the same `buildContext` call underneath.
 */
export async function retrieveNode(
  state: ChatGraphState,
): Promise<Partial<ChatGraphState>> {
  const context = await buildContext(state.query, {
    requestId: state.requestId,
    sessionId: state.sessionId,
  });
  return {
    retrievedContext: context,
    totalTokensUsed: state.totalTokensUsed + context.usageTokens,
  };
}
