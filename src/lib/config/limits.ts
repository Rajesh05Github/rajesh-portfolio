/**
 * Centralized numeric limits — never inline a magic number in a route
 * handler (docs/token-cost-control.md §2, master prompt §74). Chat/RAG
 * limits are added here starting Phase 14; this file starts with the
 * limits Phase 4 (admin auth) actually needs.
 */
export const LOGIN_RATE_LIMIT = {
  /** Failed + successful attempts from a single IP, across all accounts. */
  perIp: { limit: 20, windowSeconds: 15 * 60 },
  /** Attempts against a single email address, regardless of source IP. */
  perAccount: { limit: 5, windowSeconds: 15 * 60 },
} as const;

export const SESSION = {
  durationSeconds: 7 * 24 * 60 * 60, // 7 days
  /** Renew the session (and its cookie) once less than this much time remains. */
  renewThresholdSeconds: 24 * 60 * 60, // 1 day
} as const;

export const RESUME_UPLOAD = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ["application/pdf"] as const,
} as const;

export const AVATAR_UPLOAD = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
} as const;

export const RESUME_DOWNLOAD_RATE_LIMIT = {
  /** Generous — this is abuse mitigation on a public unauthenticated endpoint, not a real usage cap. */
  perIp: { limit: 30, windowSeconds: 60 * 60 },
} as const;

export const CONTACT_FORM_RATE_LIMIT = {
  /** A real person submitting the contact form more than a handful of times an hour is not the normal case — this is spam mitigation, not a usage cap. */
  perIp: { limit: 5, windowSeconds: 60 * 60 },
} as const;

export const CONTACT_MESSAGE_LIMITS = {
  nameMaxLength: 200,
  subjectMaxLength: 200,
  messageMaxLength: 5000,
} as const;

/**
 * Abuse mitigation for `/api/chat` — every request reaches a real LLM.
 * `perIpBurst` is a separate, much tighter window layered on top of
 * `perSession`/`perIp` (docs/security.md §8's "requests/minute" vs
 * "requests/hour" distinction) — a script firing 20 requests in the first
 * second of a 10-minute window would sail under `perIp` right up until the
 * 60th request; `perIpBurst` catches that shape of abuse within seconds
 * instead. Token-volume ceilings (a different, cost-focused axis) are
 * `TOKEN_BUDGET` below.
 */
export const CHAT_RATE_LIMIT = {
  perSession: { limit: 20, windowSeconds: 10 * 60 },
  perIp: { limit: 60, windowSeconds: 10 * 60 },
  perIpBurst: { limit: 8, windowSeconds: 60 },
} as const;

export const CHAT_SESSION_COOKIE_NAME = "chat_session";
export const CHAT_SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * How long a chat transcript survives server-side before the retention job
 * (lib/queue/chat-retention-queue.ts, workers/chat-retention-worker.ts)
 * deletes it — deliberately longer than
 * `CHAT_SESSION_COOKIE_MAX_AGE_SECONDS` above, so an admin can still review
 * a conversation on the "Conversations" admin page for a while after the
 * visitor's own cookie has expired and they've lost access to it
 * themselves, but not forever.
 */
export const CHAT_RETENTION_DAYS = 90;

/**
 * Token-volume ceilings, layered per docs/token-cost-control.md §2 — request
 * counting (`CHAT_RATE_LIMIT` above) catches someone hammering the endpoint;
 * these catch someone having long, expensive conversations well within the
 * request-count limit. Defaults are a starting point sized for realistic
 * portfolio-visitor traffic, not a precise budget — tune via this file once
 * real `UsageRecord` data (the admin cost dashboard) shows actual usage
 * patterns.
 *
 * `perSessionMaxTotalTokens` is checked against `ChatSession.totalTokens`
 * directly (already loaded once per request for the session lookup) rather
 * than a parallel Redis counter — one source of truth, no drift risk.
 * `perIpDailyMaxTokens`/`globalDailyMaxTokens` use Redis 24h fixed windows
 * since there's no equivalent already-loaded row to check against.
 */
export const TOKEN_BUDGET = {
  perSessionMaxTotalTokens: 50_000,
  perIpDailyMaxTokens: 150_000,
  globalDailyMaxTokens: 3_000_000,
  dailyWindowSeconds: 24 * 60 * 60,
} as const;
