import { MODELS } from "./models";

/**
 * Chat graph tuning — centralized per master prompt §74 (no magic numbers
 * scattered across node files). Model routing (§41, `lib/config/models.ts`):
 * both classification and generation default to the same small model — a
 * "complex request → bigger model" split isn't justified yet at this
 * project's scale, but the two reference `MODELS` independently so
 * upgrading generation alone later is one line there.
 */
export const CHAT_CONFIG = {
  maxMessageLength: 2000,
  intentModel: MODELS.intentClassification,
  generationModel: MODELS.generation,
  /** Hard cap on tool-call round-trips per request — "controlled agentic behavior, not autonomous" (master prompt §31). */
  maxToolCallRounds: 2,
} as const;

/**
 * Cheap pre-filter checked *before* spending an LLM call on intent
 * classification (master prompt §90 — don't waste retrieval/LLM cost on
 * obvious abuse). Not exhaustive — layered with the LLM classifier, never a
 * complete solution on its own (docs/security.md §6).
 */
export const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all|any|previous|prior)\s+instructions/i,
  /reveal\s+(your|the)\s+system\s+prompt/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+(an?\s+)?(admin|administrator|root|system)/i,
  /disregard\s+(all|any)\s+(prior|previous)\s+(rules|instructions)/i,
  /print\s+(your|the)\s+(instructions|prompt)/i,
];

/**
 * Best-effort output scan for `validate.ts` (docs/security.md §6) — checked
 * for LOGGING/FLAGGING purposes only. It cannot redact or block a leak
 * already in flight: by the time `validate` runs, `generate`'s tokens have
 * already been streamed to the visitor live (that's the whole point of
 * streaming). Real prevention is the system prompt's own instruction to
 * never reveal itself, plus `PROMPT_INJECTION_PATTERNS` blocking the most
 * common elicitation attempts before generation even starts — this is a
 * second, independent layer for the cases that get through, not a
 * replacement for either.
 */
export const SYSTEM_PROMPT_LEAK_PATTERNS: RegExp[] = [
  /my (system prompt|instructions) (is|are|say)/i,
  /as an ai assistant embedded in/i,
  /i (was|am) instructed to/i,
  /here (is|are) my (system prompt|instructions)/i,
];

/** Rejected before `request.json()` even runs — a real chat message never legitimately needs more than a few KB of JSON envelope around it (docs/security.md §3, "OVERSIZED_INPUT"). */
export const MAX_CHAT_BODY_BYTES = 8 * 1024;
