import { SYSTEM_PROMPT_LEAK_PATTERNS } from "@/lib/config/chat";
import type { ChatGraphState } from "../state";

/**
 * Heuristic-only grounding check — no extra LLM call spent verifying the
 * answer (docs/rag.md §9: "flags, does not silently block"). Extracts
 * capitalized/proper-noun-like terms from the answer and checks each appears
 * somewhere in the retrieved context text; this is a coarse signal for
 * admin/eval visibility, not a hard gate on the response.
 */
const COMMON_CAPITALIZED_WORDS = new Set([
  "I",
  "The",
  "A",
  "An",
  "It",
  "This",
  "That",
  "He",
  "She",
  "They",
  "We",
  "You",
  "Yes",
  "No",
]);

function extractProperNouns(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-zA-Z0-9+.#-]*\b/g) ?? [];
  return [...new Set(matches)].filter(
    (word) => !COMMON_CAPITALIZED_WORDS.has(word),
  );
}

export function validateNode(state: ChatGraphState): Partial<ChatGraphState> {
  const answer = state.answer;
  if (!answer) {
    return { grounded: false };
  }

  // Best-effort, log-only (see SYSTEM_PROMPT_LEAK_PATTERNS) — cannot undo
  // tokens already streamed to the visitor by the time this runs.
  const abuseKind = SYSTEM_PROMPT_LEAK_PATTERNS.some((pattern) =>
    pattern.test(answer),
  )
    ? "OTHER"
    : undefined;

  const contextText = (state.retrievedContext?.text ?? "").toLowerCase();
  const terms = extractProperNouns(answer);
  if (terms.length === 0) {
    return { grounded: true, abuseKind };
  }

  const ungrounded = terms.filter(
    (term) => !contextText.includes(term.toLowerCase()),
  );
  const grounded = ungrounded.length / terms.length < 0.5;

  return { grounded, abuseKind };
}
