import { CHAT_CONFIG, PROMPT_INJECTION_PATTERNS } from "@/lib/config/chat";
import type { ChatGraphState } from "../state";

/**
 * Runs before any LLM call — an obvious-abuse match here skips intent
 * classification entirely (routed straight to reject by the graph's
 * conditional edge), saving a full LLM round-trip on cases that don't need
 * one (master prompt §90). This is a cheap pattern-match layer, not a
 * complete defense — it's layered with the LLM classifier, never a
 * replacement for it (docs/security.md §6).
 */
export function securityCheckNode(
  state: ChatGraphState,
): Partial<ChatGraphState> {
  const query = state.query.trim();

  if (!query) {
    return {
      intent: "ABUSE",
      rejectionReason: "Empty message.",
      abuseKind: "OTHER",
    };
  }
  if (query.length > CHAT_CONFIG.maxMessageLength) {
    return {
      intent: "ABUSE",
      rejectionReason: `Message exceeds ${CHAT_CONFIG.maxMessageLength} characters.`,
      abuseKind: "OVERSIZED_INPUT",
    };
  }
  const matched = PROMPT_INJECTION_PATTERNS.find((pattern) =>
    pattern.test(query),
  );
  if (matched) {
    return {
      intent: "ABUSE",
      rejectionReason: "Message matched a known prompt-injection pattern.",
      abuseKind: "PROMPT_INJECTION",
    };
  }

  return {};
}
