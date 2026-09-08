import { Queue } from "bullmq";
import { createQueueConnection } from "./connection";

export const KNOWLEDGE_INDEXING_QUEUE_NAME = "knowledge-indexing";

export type KnowledgeIndexingJobData = { documentId: string };

declare global {
  var __knowledgeIndexingQueue: Queue<KnowledgeIndexingJobData> | undefined;
}

function createQueue(): Queue<KnowledgeIndexingJobData> {
  return new Queue<KnowledgeIndexingJobData>(KNOWLEDGE_INDEXING_QUEUE_NAME, {
    connection: createQueueConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  });
}

const knowledgeIndexingQueue =
  globalThis.__knowledgeIndexingQueue ?? createQueue();
if (process.env.NODE_ENV !== "production") {
  globalThis.__knowledgeIndexingQueue = knowledgeIndexingQueue;
}

/** The only way anything enqueues indexing work — never construct a Queue instance elsewhere (docs/architecture.md — workers/ consumes this same queue). */
export async function enqueueKnowledgeIndexing(
  documentId: string,
): Promise<void> {
  await knowledgeIndexingQueue.add("index", { documentId });
}
