import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, peekRateLimitCount } from "@/lib/security/rate-limit";
import { redis } from "@/lib/redis/client";

// `.env.test` points REDIS_URL at db index 1 on the same dev Redis
// container — FLUSHDB here only ever clears that isolated keyspace.
beforeEach(async () => {
  await redis.flushdb();
});

afterAll(async () => {
  await redis.flushdb();
  await redis.quit();
});

describe("checkRateLimit", () => {
  it("allows requests under the limit and reports remaining correctly", async () => {
    const key = `test:${randomUUID()}`;
    const result = await checkRateLimit(key, { limit: 5, windowSeconds: 60 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks once the limit is exceeded", async () => {
    const key = `test:${randomUUID()}`;
    const config = { limit: 3, windowSeconds: 60 };
    await checkRateLimit(key, config);
    await checkRateLimit(key, config);
    const third = await checkRateLimit(key, config);
    const fourth = await checkRateLimit(key, config);

    expect(third.allowed).toBe(true);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it("sets a TTL on first write and does not reset it on subsequent writes", async () => {
    const key = `test:${randomUUID()}`;
    const config = { limit: 100, windowSeconds: 60 };
    await checkRateLimit(key, config);
    const ttlAfterFirst = await redis.ttl(`ratelimit:${key}`);
    expect(ttlAfterFirst).toBeGreaterThan(0);
    expect(ttlAfterFirst).toBeLessThanOrEqual(60);

    await checkRateLimit(key, config);
    const ttlAfterSecond = await redis.ttl(`ratelimit:${key}`);
    // Never reset backwards up to the full window on a later write —
    // it should only ever count down from the first write's expiry.
    expect(ttlAfterSecond).toBeLessThanOrEqual(ttlAfterFirst);
  });

  it("increments by a real amount, not just by 1 (token-budget use)", async () => {
    const key = `test:${randomUUID()}`;
    const config = { limit: 1000, windowSeconds: 60 };
    const result = await checkRateLimit(key, config, 500);
    expect(result.remaining).toBe(500);

    const second = await checkRateLimit(key, config, 600);
    expect(second.allowed).toBe(false);
  });
});

describe("peekRateLimitCount", () => {
  it("returns 0 for a key that has never been written", async () => {
    expect(await peekRateLimitCount(`test:${randomUUID()}`)).toBe(0);
  });

  it("returns the current count without mutating it", async () => {
    const key = `test:${randomUUID()}`;
    await checkRateLimit(key, { limit: 10, windowSeconds: 60 }, 3);

    expect(await peekRateLimitCount(key)).toBe(3);
    expect(await peekRateLimitCount(key)).toBe(3);
  });
});
