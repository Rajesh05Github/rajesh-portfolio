/**
 * Standalone-process worker (docs/architecture.md: `workers/` is a separate
 * process, not inline request handling) — started alongside every other
 * worker by workers/index.ts, the actual process entrypoint. Not run or
 * imported directly. Consumes the same queue
 * lib/queue/knowledge-indexing-queue.ts's enqueueKnowledgeIndexing() feeds.
 */
import { Worker, type Job } from "bullmq";
import { createQueueConnection } from "@/lib/queue/connection";
import {
  KNOWLEDGE_INDEXING_QUEUE_NAME,
  type KnowledgeIndexingJobData,
} from "@/lib/queue/knowledge-indexing-queue";
import { indexKnowledgeDocument } from "@/features/rag/index-document";
import { logger } from "@/lib/observability/logger";
import { startTimer } from "@/lib/observability/timer";

export const worker = new Worker<KnowledgeIndexingJobData>(
  KNOWLEDGE_INDEXING_QUEUE_NAME,
  async (job: Job<KnowledgeIndexingJobData>) => {
    const timer = startTimer();
    logger.info("indexing document", {
      service: "worker",
      documentId: job.data.documentId,
      jobId: job.id,
    });
    await indexKnowledgeDocument(job.data.documentId);
    logger.info("indexed document", {
      service: "worker",
      documentId: job.data.documentId,
      jobId: job.id,
      durationMs: timer.elapsedMs(),
    });
  },
  { connection: createQueueConnection(), concurrency: 2 },
);

worker.on("failed", (job, error) => {
  logger.error("indexing job failed", {
    service: "worker",
    documentId: job?.data.documentId,
    jobId: job?.id,
    error,
  });
});

logger.info("knowledge indexing worker started, waiting for jobs", {
  service: "worker",
});
