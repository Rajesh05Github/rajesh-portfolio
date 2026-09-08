import { redis } from "@/lib/redis/client";

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

/**
 * Fixed-window counter (Redis INCRBY + EXPIRE) — chosen over a sliding-window
 * log for simplicity: one key, one round-trip (plus a TTL check), no cleanup
 * job. The tradeoff (a burst can land up to ~2x `limit` right at a window
 * boundary) is acceptable for the abuse-mitigation use cases this backs
 * (docs/security.md §8); it is not a precise billing meter.
 *
 * `amount` defaults to 1 (request-counting, the original use — login
 * attempts, resume downloads, chat messages) but also backs token-volume
 * budgets (docs/token-cost-control.md §2) by incrementing by a real token
 * count instead of by one. A TTL of -1 (no expiry set) is how a fresh
 * window is detected, rather than `count === amount` — correct regardless
 * of what `amount` is, unlike a naive `count === 1` check would be once
 * increments stopped being uniformly 1.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  amount = 1,
): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incrby(redisKey, amount);
  const ttl = await redis.ttl(redisKey);

  if (ttl === -1) {
    await redis.expire(redisKey, config.windowSeconds);
  }

  const resetAt = new Date(Date.now() + Math.max(ttl, 0) * 1000);

  return {
    allowed: count <= config.limit,
    remaining: Math.max(config.limit - count, 0),
    resetAt,
  };
}

/** Read-only peek at a counter's current value — for a pre-check gate where the actual increment amount (e.g. real token usage) isn't known until after the call completes. Never creates or extends the key. */
export async function peekRateLimitCount(key: string): Promise<number> {
  const value = await redis.get(`ratelimit:${key}`);
  return value ? Number(value) : 0;
}
