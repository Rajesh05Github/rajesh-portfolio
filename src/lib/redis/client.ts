import Redis from "ioredis";

// Ephemeral/fast-path only — never a source of truth (docs/decisions/0004-redis-roles.md).
// Cached on globalThis for the same hot-reload reason as the DB client.
declare global {
  var __redisClient: Redis | undefined;
}

function createClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "REDIS_URL is not set — copy .env.example to .env and configure it.",
    );
  }
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}

export const redis = globalThis.__redisClient ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalThis.__redisClient = redis;
}
