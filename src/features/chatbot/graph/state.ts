import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import type { BuiltContext } from "@/features/rag/context-builder";

export type ChatIntent = "PORTFOLIO_QUESTION" | "GENERAL_QUESTION" | "ABUSE";

/**
 * A subset of `AbuseEventKind` (`lib/security/abuse-tracking.ts`) — only the
 * kinds the graph itself can ever detect. `RATE_LIMIT`/`TOKEN_LIMIT` are
 * detected in `/api/chat` before the graph even runs, so they're not
 * reachable here; that's enforced by this narrower type, not just convention.
 */
export type GraphAbuseKind = "PROMPT_INJECTION" | "OVERSIZED_INPUT" | "OTHER";

/**
 * `messages` (from `MessagesAnnotation`) is the only field with a custom
 * reducer (append) — every other field is "last write wins" by default,
 * which is exactly what a linear graph with no parallel branches needs; no
 * reducer boilerplate for scalars (docs/architecture.md §5).
 */
export const ChatGraphAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  query: Annotation<string>,
  requestId: Annotation<string>,
  /** Set only when the run is driven by `/api/chat` (a real visitor turn) — undefined for the admin chat-test tool, which has no `ChatSession` (docs/token-cost-control.md §2, §4: `UsageRecord.sessionId` is nullable for exactly this reason). */
  sessionId: Annotation<string | undefined>,
  intent: Annotation<ChatIntent | undefined>,
  rejectionReason: Annotation<string | undefined>,
  /** Set by `security` (input-side) or `validate` (a detected leak in the output, best-effort — docs/security.md §6, §8) — lets `/api/chat` log a specific `AbuseEvent` kind instead of a generic one. */
  abuseKind: Annotation<GraphAbuseKind | undefined>,
  retrievedContext: Annotation<BuiltContext | undefined>,
  answer: Annotation<string | undefined>,
  grounded: Annotation<boolean | undefined>,
  toolCallCount: Annotation<number>,
  /** Running sum of real (not estimated) tokens across every OpenAI call this turn has made so far — intent classification, reranking, generation. Fed into `ChatSession.totalTokens` and the daily Redis token budgets after the run (docs/token-cost-control.md §2). */
  totalTokensUsed: Annotation<number>,
});

export type ChatGraphState = typeof ChatGraphAnnotation.State;
