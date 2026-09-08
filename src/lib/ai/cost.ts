import { PRICING_USD_PER_MILLION_TOKENS } from "@/lib/config/pricing";
import type { ModelName } from "@/lib/config/models";

/** Falls back to $0 (never throws) for a model string outside the known pricing table — an unrecognized model shouldn't crash the request that's already succeeded; it should just show up as an accounting gap, which is easy to notice in the dashboard. */
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = PRICING_USD_PER_MILLION_TOKENS[model as ModelName];
  if (!pricing) return 0;
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}
