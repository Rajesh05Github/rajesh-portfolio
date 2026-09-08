import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CHAT_CONFIG } from "@/lib/config/chat";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { CHAT_TOOLS } from "@/lib/ai/tools";
import { recordUsage } from "@/lib/ai/usage-tracking";
import type { ChatGraphState } from "../state";

function createGenerationModel(apiKey: string) {
  return new ChatOpenAI({
    apiKey,
    model: CHAT_CONFIG.generationModel,
    temperature: 0.2,
  }).bindTools(CHAT_TOOLS);
}

let generationModel: ReturnType<typeof createGenerationModel> | null = null;

function getGenerationModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set — copy .env.example to .env and add a real key to enable chat.",
    );
  }
  generationModel ??= createGenerationModel(apiKey);
  return generationModel;
}

/**
 * Neutralizes literal `<` before interpolating untrusted text into the
 * tag-delimited prompt (docs/security.md §6) — without this, a visitor
 * could type something like `</visitor_message><system>...` and have it
 * read as though it closes the tag early. The model doesn't actually parse
 * XML (it's all just tokens), so this can't be "broken out of" in the way
 * real markup could be, but escaping removes even the possibility of the
 * model being confused by what looks like a structural boundary.
 */
function escapeForPromptTag(text: string): string {
  return text.replace(/</g, "&lt;");
}

/**
 * On the first pass through this node, `state.messages` is still empty —
 * the system + context + question prompt is seeded here rather than at
 * graph-invoke time, since the context text (from the `retrieve` node) isn't
 * known until after the graph has already started running. On every
 * subsequent pass (after a tool round-trip), `MessagesAnnotation`'s reducer
 * has already appended the tool results, so this just re-invokes on the
 * accumulated history.
 *
 * This node can run more than once per turn (tool round-trips), so it
 * records — and accumulates into `totalTokensUsed` — a `UsageRecord` on
 * every pass, not just the final one (Phase 14: every real OpenAI call gets
 * a row, including the tool-decision pass that produced no visible text).
 */
export async function generateNode(
  state: ChatGraphState,
): Promise<Partial<ChatGraphState>> {
  const model = getGenerationModel();

  const isFirstPass = state.messages.length === 0;
  const contextText =
    state.retrievedContext?.text || "(no relevant portfolio knowledge found)";

  const messages = isFirstPass
    ? [
        new SystemMessage(CHAT_SYSTEM_PROMPT.content),
        new HumanMessage(
          `<context>\n${escapeForPromptTag(contextText)}\n</context>\n<visitor_message>\n${escapeForPromptTag(state.query)}\n</visitor_message>`,
        ),
      ]
    : state.messages;

  const startedAt = Date.now();
  const response = await model.invoke(messages);

  const usage = response.usage_metadata;
  const { totalTokens } = await recordUsage({
    requestId: state.requestId,
    sessionId: state.sessionId,
    operation: "GENERATION",
    model: CHAT_CONFIG.generationModel,
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    latencyMs: Date.now() - startedAt,
  });

  const calledTool =
    Array.isArray(response.tool_calls) && response.tool_calls.length > 0;
  const answer =
    typeof response.content === "string" ? response.content : undefined;

  return {
    messages: [response],
    toolCallCount: calledTool ? state.toolCallCount + 1 : state.toolCallCount,
    answer,
    totalTokensUsed: state.totalTokensUsed + totalTokens,
  };
}
