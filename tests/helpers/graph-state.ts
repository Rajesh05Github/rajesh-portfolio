import type { ChatGraphState } from "@/features/chatbot/graph/state";

/** Every graph node test builds its input state from this instead of hand-listing all 12 `ChatGraphState` fields each time — only the fields a given test cares about need overriding. */
export function makeState(
  overrides: Partial<ChatGraphState> = {},
): ChatGraphState {
  return {
    messages: [],
    query: "",
    requestId: "test-request-id",
    sessionId: undefined,
    intent: undefined,
    rejectionReason: undefined,
    abuseKind: undefined,
    retrievedContext: undefined,
    answer: undefined,
    grounded: undefined,
    toolCallCount: 0,
    totalTokensUsed: 0,
    ...overrides,
  };
}
