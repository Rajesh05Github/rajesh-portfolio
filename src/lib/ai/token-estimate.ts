/**
 * Length-based token estimate for display/rollup purposes (KnowledgeChunk.tokenCount,
 * ChatSession.totalTokens) — not a billing-accurate count. Real cost tracking
 * against actual API usage is Phase 14's job.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
