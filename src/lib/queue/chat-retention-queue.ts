import { Queue } from "bullmq";
import { createQueueConnection } from "./connection";

export const CHAT_RETENTION_QUEUE_NAME = "chat-retention";

/** Fixed scheduler id for the one repeatable job this queue ever runs — `upsertJobScheduler` replaces any existing schedule under this id rather than stacking up duplicates, so `scheduleChatRetentionJob` is safe to call on every worker boot. */
const RETENTION_SCHEDULER_ID = "purge-expired-chat-sessions";

declare global {
  var __chatRetentionQueue: Queue | undefined;
}

function createQueue(): Queue {
  return new Queue(CHAT_RETENTION_QUEUE_NAME, {
    connection: createQueueConnection(),
  });
}

const chatRetentionQueue = globalThis.__chatRetentionQueue ?? createQueue();
if (process.env.NODE_ENV !== "production") {
  globalThis.__chatRetentionQueue = chatRetentionQueue;
}

/**
 * Schedules the daily purge — idempotent. `upsertJobScheduler` replaces
 * whatever's already registered under `RETENTION_SCHEDULER_ID`, so calling
 * this again on every worker restart reuses the same schedule instead of
 * stacking up duplicates. Called once, at worker startup
 * (workers/chat-retention-worker.ts) — never from the Next.js app itself.
 */
export async function scheduleChatRetentionJob(): Promise<void> {
  await chatRetentionQueue.upsertJobScheduler(
    RETENTION_SCHEDULER_ID,
    { pattern: "0 3 * * *" }, // daily at 03:00 server time — low-traffic hour, not that it matters much for a delete query this cheap
    { name: "purge" },
  );
}
