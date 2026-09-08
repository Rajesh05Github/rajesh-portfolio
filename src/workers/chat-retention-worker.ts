/**
 * Standalone-process worker (docs/architecture.md: workers/ is a separate
 * process, not inline request handling) — started alongside every other
 * worker by workers/index.ts, the actual process entrypoint. Not run or
 * imported directly.
 */
import { Worker } from "bullmq";
import { createQueueConnection } from "@/lib/queue/connection";
import {
  CHAT_RETENTION_QUEUE_NAME,
  scheduleChatRetentionJob,
} from "@/lib/queue/chat-retention-queue";
import { purgeExpiredChatSessions } from "@/features/chatbot/retention";
import { logger } from "@/lib/observability/logger";
import { startTimer } from "@/lib/observability/timer";

export const worker = new Worker(
  CHAT_RETENTION_QUEUE_NAME,
  async () => {
    const timer = startTimer();
    const deletedCount = await purgeExpiredChatSessions();
    logger.info("purged expired chat sessions", {
      service: "worker",
      deletedCount,
      durationMs: timer.elapsedMs(),
    });
  },
  { connection: createQueueConnection() },
);

worker.on("failed", (job, error) => {
  logger.error("chat retention job failed", {
    service: "worker",
    jobId: job?.id,
    error,
  });
});

void scheduleChatRetentionJob();

logger.info("chat retention worker started, waiting for jobs", {
  service: "worker",
});
