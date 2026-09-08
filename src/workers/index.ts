/**
 * The actual worker process entrypoint (`npm run worker:dev`, and the
 * Dockerfile's `worker` target) — starts every background worker in one
 * Node process, since this project runs a single "worker" deployment unit
 * (docs/architecture.md), not one container per queue. Each worker module
 * is self-contained (constructs and exports its own `Worker` instance as a
 * side effect of being imported) — this file's only job is to import all
 * of them and own the one shared graceful-shutdown handler, so a SIGTERM
 * doesn't race two workers each independently calling `process.exit`.
 */
import "dotenv/config";
import { worker as knowledgeIndexingWorker } from "./knowledge-indexing-worker";
import { worker as chatRetentionWorker } from "./chat-retention-worker";
import { logger } from "@/lib/observability/logger";

logger.info("all workers started", { service: "worker" });

process.on("SIGTERM", async () => {
  await Promise.all([
    knowledgeIndexingWorker.close(),
    chatRetentionWorker.close(),
  ]);
  process.exit(0);
});
