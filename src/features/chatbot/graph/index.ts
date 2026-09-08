import { randomUUID } from "node:crypto";
import { StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";
import { CHAT_CONFIG } from "@/lib/config/chat";
import { CHAT_TOOLS } from "@/lib/ai/tools";
import { logger } from "@/lib/observability/logger";
import { startTimer } from "@/lib/observability/timer";
import type { BuiltContext } from "@/features/rag/context-builder";
import {
  ChatGraphAnnotation,
  type ChatGraphState,
  type ChatIntent,
} from "./state";
import { securityCheckNode } from "./nodes/security";
import { classifyIntentNode } from "./nodes/intent";
import { retrieveNode } from "./nodes/retrieve";
import { generateNode } from "./nodes/generate";
import { validateNode } from "./nodes/validate";
import { generalResponseNode, rejectNode } from "./nodes/responses";

type NodeFn = (
  state: ChatGraphState,
) => Partial<ChatGraphState> | Promise<Partial<ChatGraphState>>;

/**
 * A single wrapper applied to every node (docs/observability.md) instead of
 * hand-adding a log line inside each node file — every node's entry/exit,
 * duration, and a small summary of what it decided is captured uniformly,
 * with `requestId`/`sessionId` (already threaded through `ChatGraphState`
 * since Phase 12/14) on every line. `messages`/`retrievedContext` are
 * deliberately excluded from the logged summary — full message history and
 * chunk text are verbose and already recoverable from `ChatMessage`/
 * `UsageRecord` rows, not something every log line needs to repeat.
 */
function summarizeResult(
  result: Partial<ChatGraphState>,
): Record<string, unknown> {
  const {
    intent,
    rejectionReason,
    abuseKind,
    grounded,
    toolCallCount,
    totalTokensUsed,
    answer,
    retrievedContext,
  } = result;
  const summary: Record<string, unknown> = {};
  if (intent !== undefined) summary.intent = intent;
  if (rejectionReason !== undefined) summary.rejectionReason = rejectionReason;
  if (abuseKind !== undefined) summary.abuseKind = abuseKind;
  if (grounded !== undefined) summary.grounded = grounded;
  if (toolCallCount !== undefined) summary.toolCallCount = toolCallCount;
  if (totalTokensUsed !== undefined) summary.totalTokensUsed = totalTokensUsed;
  if (answer !== undefined) summary.answerLength = answer.length;
  if (retrievedContext !== undefined)
    summary.chunksRetrieved = retrievedContext.chunkIds.length;
  return summary;
}

function withNodeLogging(name: string, fn: NodeFn): NodeFn {
  return async (state) => {
    const timer = startTimer();
    try {
      const result = await fn(state);
      logger.info("graph node completed", {
        service: `graph:${name}`,
        requestId: state.requestId,
        sessionId: state.sessionId,
        durationMs: timer.elapsedMs(),
        ...summarizeResult(result),
      });
      return result;
    } catch (error) {
      logger.error("graph node failed", {
        service: `graph:${name}`,
        requestId: state.requestId,
        sessionId: state.sessionId,
        durationMs: timer.elapsedMs(),
        error,
      });
      throw error;
    }
  };
}

const FALLBACK_ANSWER =
  "I don't have enough information in my portfolio knowledge to answer that accurately.";

function routeAfterSecurity(
  state: ChatGraphState,
): "classifyIntent" | "reject" {
  return state.intent === "ABUSE" ? "reject" : "classifyIntent";
}

function routeAfterIntent(
  state: ChatGraphState,
): "retrieve" | "generalResponse" | "reject" {
  if (state.intent === "ABUSE") return "reject";
  if (state.intent === "GENERAL_QUESTION") return "generalResponse";
  return "retrieve";
}

/**
 * Bounds the tool-calling loop to `maxToolCallRounds` round-trips —
 * "controlled agentic behavior, not autonomous" (master prompt §31). Once
 * the cap is hit, the graph proceeds to `validate` even if the model asked
 * for another tool call, using whatever answer it has produced so far.
 */
function routeAfterGenerate(state: ChatGraphState): "tools" | "validate" {
  const last = state.messages.at(-1);
  const requestedTools =
    last instanceof AIMessage &&
    Array.isArray(last.tool_calls) &&
    last.tool_calls.length > 0;
  if (requestedTools && state.toolCallCount <= CHAT_CONFIG.maxToolCallRounds) {
    return "tools";
  }
  return "validate";
}

const toolNode = new ToolNode(CHAT_TOOLS);

const graph = new StateGraph(ChatGraphAnnotation)
  .addNode("security", withNodeLogging("security", securityCheckNode))
  .addNode(
    "classifyIntent",
    withNodeLogging("classifyIntent", classifyIntentNode),
  )
  .addNode("retrieve", withNodeLogging("retrieve", retrieveNode))
  .addNode("generate", withNodeLogging("generate", generateNode))
  .addNode(
    "tools",
    withNodeLogging("tools", (state) => toolNode.invoke(state)),
  )
  .addNode("validate", withNodeLogging("validate", validateNode))
  .addNode(
    "generalResponse",
    withNodeLogging("generalResponse", generalResponseNode),
  )
  .addNode("reject", withNodeLogging("reject", rejectNode))
  .addEdge(START, "security")
  .addConditionalEdges("security", routeAfterSecurity, [
    "classifyIntent",
    "reject",
  ])
  .addConditionalEdges("classifyIntent", routeAfterIntent, [
    "retrieve",
    "generalResponse",
    "reject",
  ])
  .addEdge("retrieve", "generate")
  .addConditionalEdges("generate", routeAfterGenerate, ["tools", "validate"])
  .addEdge("tools", "generate")
  .addEdge("validate", END)
  .addEdge("generalResponse", END)
  .addEdge("reject", END);

export const compiledGraph = graph.compile();

export interface ChatGraphResult {
  requestId: string;
  intent: ChatIntent | undefined;
  answer: string;
  grounded: boolean | undefined;
  retrievedContext: BuiltContext | undefined;
  toolCallCount: number;
  rejectionReason: string | undefined;
  totalTokensUsed: number;
}

/**
 * `sessionId` is optional — this is also the entry point for the admin
 * `/admin/ai/chat-test` tool, which has no real `ChatSession` to attribute
 * usage to (docs/token-cost-control.md §2, §4).
 */
export async function runChatGraph(
  query: string,
  sessionId?: string,
): Promise<ChatGraphResult> {
  const requestId = randomUUID();
  const timer = startTimer();
  logger.info("chat request received", {
    service: "chat",
    requestId,
    sessionId,
  });

  const result = await compiledGraph.invoke({
    query,
    requestId,
    sessionId,
    messages: [],
    toolCallCount: 0,
    totalTokensUsed: 0,
  });

  logger.info("chat request completed", {
    service: "chat",
    requestId,
    sessionId,
    durationMs: timer.elapsedMs(),
    intent: result.intent,
    totalTokensUsed: result.totalTokensUsed,
  });

  return {
    requestId,
    intent: result.intent,
    answer: result.answer ?? FALLBACK_ANSWER,
    grounded: result.grounded,
    retrievedContext: result.retrievedContext,
    toolCallCount: result.toolCallCount,
    rejectionReason: result.rejectionReason,
    totalTokensUsed: result.totalTokensUsed,
  };
}
