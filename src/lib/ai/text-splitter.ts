import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Phase 9 shipped a hand-rolled paragraph→sentence→character-fallback
 * splitter (documented then as a deliberate placeholder — see the git
 * history of features/rag/chunking.ts — pending this exact phase). LangChain's
 * `RecursiveCharacterTextSplitter` does the same boundary-first strategy
 * with a wider, battle-tested separator list and correct overlap handling,
 * for less code than we were maintaining by hand — a genuine win, not
 * LangChain for its own sake (docs/decisions/0006-langchain-langgraph.md).
 *
 * Chunk size/overlap are in characters (~4 chars/token heuristic) since no
 * tokenizer is wired up — same units the Phase 9 version used, so callers
 * (features/rag/chunking.ts) didn't need to change their target numbers.
 */
const TARGET_CHARS = 2000; // ~500 tokens
const OVERLAP_CHARS = 200; // ~50 tokens

let splitter: RecursiveCharacterTextSplitter | null = null;

function getSplitter(): RecursiveCharacterTextSplitter {
  splitter ??= new RecursiveCharacterTextSplitter({
    chunkSize: TARGET_CHARS,
    chunkOverlap: OVERLAP_CHARS,
  });
  return splitter;
}

export async function splitLongText(text: string): Promise<string[]> {
  const normalized = text.trim();
  if (!normalized) return [];
  return getSplitter().splitText(normalized);
}
