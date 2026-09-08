import { splitLongText } from "@/lib/ai/text-splitter";

/**
 * Domain-level chunking policy (docs/rag.md §3): which content gets split at
 * all, and by what strategy, is a decision this module owns. The actual
 * splitting *mechanism* lives behind lib/ai/text-splitter.ts (LangChain's
 * `RecursiveCharacterTextSplitter`, Phase 11) — this file never imports
 * LangChain directly, per ADR-0006's "confined to lib/ai" boundary.
 */
export async function chunkLongText(text: string): Promise<string[]> {
  return splitLongText(text);
}
