import { randomUUID } from "node:crypto";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { MODELS } from "@/lib/config/models";
import { EVALUATION_JUDGE_PROMPT } from "./prompts";
import { recordUsage } from "./usage-tracking";

const judgeResponseSchema = z.object({
  retrievalRelevance: z.array(
    z.object({
      index: z.number().int().min(0),
      relevant: z.boolean(),
    }),
  ),
  answerRelevance: z.number().min(0).max(10),
  faithful: z.boolean(),
  unsupportedClaims: z.array(z.string()),
  answerCorrectness: z.number().min(0).max(10),
});

export type JudgeVerdict = z.infer<typeof judgeResponseSchema>;

function createJudgeModel(apiKey: string) {
  return new ChatOpenAI({
    apiKey,
    model: MODELS.evaluationJudge,
    temperature: 0,
  }).withStructuredOutput(judgeResponseSchema, { includeRaw: true });
}

let judgeModel: ReturnType<typeof createJudgeModel> | null = null;

function getJudgeModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set — copy .env.example to .env and add a real key to run evaluations.",
    );
  }
  judgeModel ??= createJudgeModel(apiKey);
  return judgeModel;
}

export type JudgeInput = {
  question: string;
  expectedAnswer: string | null;
  actualAnswer: string;
  retrievedChunks: { content: string }[];
  requestId?: string;
};

const CONTENT_PREVIEW_CHARS = 500;

function buildPrompt(input: JudgeInput): string {
  const chunkList = input.retrievedChunks
    .map((c, i) => `[${i}] ${c.content.slice(0, CONTENT_PREVIEW_CHARS)}`)
    .join("\n\n");

  return `Question: "${input.question}"

Retrieved chunks:
${chunkList || "(none retrieved)"}

Generated answer: "${input.actualAnswer}"

${input.expectedAnswer ? `Reference answer: "${input.expectedAnswer}"` : "No reference answer was provided for this case."}

Score every retrieved chunk by index (there are ${input.retrievedChunks.length}), then score answerRelevance, faithfulness (with any unsupported claims), and answerCorrectness as instructed.`;
}

/** One structured-output call scores every metric together (see prompts/judge.ts) — real cost, tracked like any other real OpenAI call (docs/evaluation.md §4). */
export async function judgeChatTurn(input: JudgeInput): Promise<JudgeVerdict> {
  const model = getJudgeModel();
  const startedAt = Date.now();
  const { raw, parsed } = await model.invoke([
    { role: "system", content: EVALUATION_JUDGE_PROMPT.content },
    { role: "user", content: buildPrompt(input) },
  ]);

  const usage = raw instanceof AIMessage ? raw.usage_metadata : undefined;
  await recordUsage({
    requestId: input.requestId ?? randomUUID(),
    operation: "EVALUATION_JUDGE",
    model: MODELS.evaluationJudge,
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    latencyMs: Date.now() - startedAt,
  });

  return parsed;
}
