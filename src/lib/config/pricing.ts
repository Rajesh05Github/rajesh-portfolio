import type { ModelName } from "./models";

/**
 * USD per 1,000,000 tokens. Sourced from OpenAI's published pricing
 * (https://platform.openai.com/docs/pricing, checked 2026-09-07) — not
 * guessed, since `estimatedCostUsd` rows feed a real admin dashboard
 * (master prompt §97: no fabricated metrics). Re-check this table whenever
 * `lib/config/models.ts` changes, or periodically against provider pricing.
 *
 * Embeddings have no output tokens, hence `output: 0`.
 */
export const PRICING_USD_PER_MILLION_TOKENS: Record<
  ModelName,
  { input: number; output: number }
> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
};
