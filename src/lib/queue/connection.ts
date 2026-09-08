import Redis from "ioredis";

/**
 * A separate ioredis connection from lib/redis/client.ts, specifically for
 * BullMQ — it requires `maxRetriesPerRequest: null` on any connection used
 * for blocking commands (workers polling for jobs), which is the opposite
 * of what the app's general-purpose Redis client wants (a bounded retry
 * count for rate-limiting/session lookups). Sharing one client between the
 * two would misconfigure whichever concern came second.
 *
 * No `import "server-only"` here (unlike most of lib/*) — this module is
 * also imported by the standalone worker process (src/workers/*), which
 * runs outside Next.js's build entirely; `server-only`'s guard throws
 * unconditionally in that context, since it relies on Next's bundler to
 * strip it on the server side.
 */
export function createQueueConnection(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "REDIS_URL is not set — copy .env.example to .env and configure it.",
    );
  }
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
