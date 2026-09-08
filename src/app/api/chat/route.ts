import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { checkRateLimit, peekRateLimitCount } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { recordAbuseEvent } from "@/lib/security/abuse-tracking";
import { logger } from "@/lib/observability/logger";
import { startTimer } from "@/lib/observability/timer";
import { CHAT_RATE_LIMIT, TOKEN_BUDGET } from "@/lib/config/limits";
import { CHAT_CONFIG, MAX_CHAT_BODY_BYTES } from "@/lib/config/chat";
import { compiledGraph } from "@/features/chatbot/graph";
import type {
  ChatIntent,
  GraphAbuseKind,
} from "@/features/chatbot/graph/state";
import type { BuiltContext } from "@/features/rag/context-builder";
import {
  appendChatMessage,
  getOrCreateActiveSession,
  hashIp,
  touchChatSession,
} from "@/features/chatbot/session";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(CHAT_CONFIG.maxMessageLength),
});

const FALLBACK_ANSWER =
  "I don't have enough information in my portfolio knowledge to answer that accurately.";
const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

/**
 * A Route Handler rather than a Server Action — this is the one place the
 * app needs a genuinely streamed `Response` body (SSE-style, but framed as
 * newline-delimited JSON rather than the `text/event-stream` format, since
 * this endpoint is only ever consumed by this project's own widget via
 * `fetch()` + a manual reader, not `EventSource`, so there's nothing to gain
 * from the extra framing overhead).
 *
 * No admin auth here by design — this is the public chatbot endpoint.
 * Protection is layered (docs/security.md §8, docs/token-cost-control.md
 * §2): oversized-payload rejection, burst + sustained request-count rate
 * limits, token-volume ceilings, the graph's own internal security/intent
 * gating, and (Phase 15) an `AbuseEvent` row at every one of those rejection
 * points, feeding the admin security dashboard.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ipHash = hashIp(ip);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_CHAT_BODY_BYTES) {
    await recordAbuseEvent({
      ipHash,
      kind: "OVERSIZED_INPUT",
      detail: `content-length ${contentLength} bytes`,
    });
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }
  const { message } = parsed.data;

  // Cheapest possible short-circuit first (docs/token-cost-control.md §2's
  // ordering): a global daily ceiling check is one Redis GET, before any
  // session lookup or DB write.
  const globalTokensToday = await peekRateLimitCount(`tokens:global-daily`);
  if (globalTokensToday >= TOKEN_BUDGET.globalDailyMaxTokens) {
    await recordAbuseEvent({
      ipHash,
      kind: "TOKEN_LIMIT",
      detail: "Global daily token budget reached.",
    });
    return NextResponse.json(
      {
        error:
          "The AI assistant has reached its usage limit for today. Please try again tomorrow.",
      },
      { status: 503 },
    );
  }

  const ipTokensToday = await peekRateLimitCount(`tokens:ip-daily:${ip}`);
  if (ipTokensToday >= TOKEN_BUDGET.perIpDailyMaxTokens) {
    await recordAbuseEvent({
      ipHash,
      kind: "TOKEN_LIMIT",
      detail: "Per-IP daily token budget reached.",
    });
    return NextResponse.json(
      {
        error:
          "You've reached today's usage limit for the AI assistant. Please try again tomorrow.",
      },
      { status: 429 },
    );
  }

  const burstLimit = await checkRateLimit(
    `chat:ip-burst:${ip}`,
    CHAT_RATE_LIMIT.perIpBurst,
  );
  if (!burstLimit.allowed) {
    await recordAbuseEvent({
      ipHash,
      kind: "RATE_LIMIT",
      detail: "Per-IP burst limit exceeded.",
    });
    return NextResponse.json(
      {
        error:
          "Too many messages. Please wait a moment before sending another.",
      },
      { status: 429 },
    );
  }

  const session = await getOrCreateActiveSession(ipHash);

  if (session.totalTokens >= TOKEN_BUDGET.perSessionMaxTotalTokens) {
    await recordAbuseEvent({
      sessionId: session.id,
      ipHash,
      kind: "TOKEN_LIMIT",
      detail: "Per-session token budget reached.",
    });
    return NextResponse.json(
      {
        error:
          "This conversation has reached its usage limit. Please start a new session.",
      },
      { status: 429 },
    );
  }

  const [sessionLimit, ipLimit] = await Promise.all([
    checkRateLimit(`chat:session:${session.id}`, CHAT_RATE_LIMIT.perSession),
    checkRateLimit(`chat:ip:${ip}`, CHAT_RATE_LIMIT.perIp),
  ]);
  if (!sessionLimit.allowed || !ipLimit.allowed) {
    await recordAbuseEvent({
      sessionId: session.id,
      ipHash,
      kind: "RATE_LIMIT",
      detail: !sessionLimit.allowed
        ? "Per-session request limit exceeded."
        : "Per-IP request limit exceeded.",
    });
    return NextResponse.json(
      {
        error:
          "Too many messages. Please wait a moment before sending another.",
      },
      { status: 429 },
    );
  }

  const requestId = randomUUID();
  const requestTimer = startTimer();
  logger.info("chat request received", {
    service: "chat",
    requestId,
    sessionId: session.id,
  });
  await appendChatMessage({
    sessionId: session.id,
    role: "VISITOR",
    content: message,
    requestId,
  });

  const encoder = new TextEncoder();
  let finalIntent: ChatIntent | undefined;
  let finalGrounded: boolean | undefined;
  let finalContext: BuiltContext | undefined;
  let finalAnswer = "";
  let finalRejectionReason: string | undefined;
  let finalAbuseKind: GraphAbuseKind | undefined;
  let finalTotalTokensUsed = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        const graphStream = await compiledGraph.stream(
          {
            query: message,
            requestId,
            sessionId: session.id,
            messages: [],
            toolCallCount: 0,
            totalTokensUsed: 0,
          },
          { streamMode: ["messages", "updates"] },
        );

        for await (const chunk of graphStream) {
          const [mode, payload] = chunk as [string, unknown];

          if (mode === "messages") {
            const [messageChunk, metadata] = payload as [
              { content: unknown },
              Record<string, unknown>,
            ];
            if (
              metadata.langgraph_node === "generate" &&
              typeof messageChunk.content === "string" &&
              messageChunk.content.length > 0
            ) {
              send({ type: "token", text: messageChunk.content });
            }
            continue;
          }

          // mode === "updates": a partial state object keyed by the node that just ran.
          const updates = payload as Record<
            string,
            Record<string, unknown> | undefined
          >;
          for (const nodeUpdate of Object.values(updates)) {
            if (!nodeUpdate) continue;
            if (typeof nodeUpdate.intent === "string")
              finalIntent = nodeUpdate.intent as ChatIntent;
            if (nodeUpdate.retrievedContext)
              finalContext = nodeUpdate.retrievedContext as BuiltContext;
            if (typeof nodeUpdate.grounded === "boolean")
              finalGrounded = nodeUpdate.grounded;
            if (typeof nodeUpdate.answer === "string")
              finalAnswer = nodeUpdate.answer;
            if (typeof nodeUpdate.rejectionReason === "string")
              finalRejectionReason = nodeUpdate.rejectionReason;
            if (typeof nodeUpdate.abuseKind === "string")
              finalAbuseKind = nodeUpdate.abuseKind as GraphAbuseKind;
            if (typeof nodeUpdate.totalTokensUsed === "number")
              finalTotalTokensUsed = nodeUpdate.totalTokensUsed;
          }
        }

        const answer = finalAnswer || FALLBACK_ANSWER;
        const sources = dedupeSources(finalContext);

        await appendChatMessage({
          sessionId: session.id,
          role: "ASSISTANT",
          content: answer,
          intent: finalIntent,
          retrievedChunkIds: finalContext?.chunkIds,
          requestId,
        });
        await touchChatSession(session.id, {
          messages: 2,
          tokens: finalTotalTokensUsed,
        });

        if (finalAbuseKind) {
          await recordAbuseEvent({
            sessionId: session.id,
            ipHash,
            kind: finalAbuseKind,
            detail:
              finalRejectionReason ?? `Graph flagged intent=${finalIntent}`,
          });
        }

        // Real usage (not an estimate) feeds the daily budgets checked above —
        // reject/general-response turns cost 0 real tokens and correctly add nothing.
        if (finalTotalTokensUsed > 0) {
          await Promise.all([
            checkRateLimit(
              `tokens:global-daily`,
              {
                limit: TOKEN_BUDGET.globalDailyMaxTokens,
                windowSeconds: TOKEN_BUDGET.dailyWindowSeconds,
              },
              finalTotalTokensUsed,
            ),
            checkRateLimit(
              `tokens:ip-daily:${ip}`,
              {
                limit: TOKEN_BUDGET.perIpDailyMaxTokens,
                windowSeconds: TOKEN_BUDGET.dailyWindowSeconds,
              },
              finalTotalTokensUsed,
            ),
          ]);
        }

        send({
          type: "done",
          requestId,
          intent: finalIntent,
          grounded: finalGrounded,
          rejectionReason: finalRejectionReason,
          sources,
          // Only the `generate` node's answer streams as tokens — `reject` and
          // `generalResponse` never invoke an LLM, so their canned answer
          // never appears as a token event. The client backfills from this
          // field when the message bubble is still empty at "done" time.
          answer,
        });

        logger.info("chat request completed", {
          service: "chat",
          requestId,
          sessionId: session.id,
          durationMs: requestTimer.elapsedMs(),
          intent: finalIntent,
          totalTokensUsed: finalTotalTokensUsed,
        });
      } catch (error) {
        // Full detail server-side only (docs/security.md §9) — a stack trace,
        // a DB error, or a missing-API-key message must never reach the
        // browser. `requestId` is the correlation key back to this log line.
        logger.error("chat request failed", {
          service: "chat",
          requestId,
          sessionId: session.id,
          durationMs: requestTimer.elapsedMs(),
          error,
        });
        send({ type: "error", message: GENERIC_ERROR_MESSAGE });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

/** Titles + source types only — never chunk content itself (that's internal grounding detail, not a citation). */
function dedupeSources(
  context: BuiltContext | undefined,
): { sourceType: string; title: string }[] {
  if (!context) return [];
  const seen = new Set<string>();
  const sources: { sourceType: string; title: string }[] = [];
  for (const chunk of context.allScored) {
    if (!context.chunkIds.includes(chunk.id)) continue;
    const sourceType = String(chunk.metadata.sourceType ?? "?");
    const title = String(chunk.metadata.title ?? "?");
    const key = `${sourceType}:${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ sourceType, title });
  }
  return sources;
}
