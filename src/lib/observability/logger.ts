/**
 * The one structured-logging entry point (docs/observability.md) — replaces
 * ad hoc `console.log`/`console.error` calls scattered across the chat
 * route and the worker. No external APM/log-shipping service (Datadog,
 * Honeycomb, OpenTelemetry collector) is wired up — a single-instance app
 * at this project's scale doesn't need distributed tracing, and one JSON
 * object per line on stdout is already exactly what a future log
 * aggregator (CloudWatch Logs agent, Loki's promtail, etc. — see
 * docs/deployment.md) ingests with zero code changes, so that upgrade path
 * stays open without building it prematurely.
 *
 * No `import "server-only"` — used by `workers/knowledge-indexing-worker.ts`,
 * a standalone process outside the Next.js app (the same constraint that
 * shaped `lib/ai/embedding-service.ts` back in Phase 9).
 */

type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown> & {
  /** Correlates every log line for one chat turn — already threaded through the graph, `UsageRecord`, and `ChatMessage` (Phases 12-14). */
  requestId?: string;
  sessionId?: string;
  /** Which subsystem emitted this line — "chat", "worker", "graph:generate", etc. */
  service?: string;
};

const isProduction = process.env.NODE_ENV === "production";

function serializeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function serializeFields(fields: LogFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = serializeValue(value);
  }
  return out;
}

function emit(level: LogLevel, message: string, fields: LogFields): void {
  const serialized = serializeFields(fields);

  if (isProduction) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...serialized,
      }),
    );
    return;
  }

  // Dev: readable for a human watching the terminal, not machine-parsed JSON.
  const logFn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log;
  const service = serialized.service;
  delete serialized.service;
  const prefix = `[observability]${service ? ` (${service})` : ""} ${message}`;
  if (Object.keys(serialized).length > 0) {
    logFn(prefix, serialized);
  } else {
    logFn(prefix);
  }
}

export const logger = {
  debug: (message: string, fields: LogFields = {}) =>
    emit("debug", message, fields),
  info: (message: string, fields: LogFields = {}) =>
    emit("info", message, fields),
  warn: (message: string, fields: LogFields = {}) =>
    emit("warn", message, fields),
  error: (message: string, fields: LogFields = {}) =>
    emit("error", message, fields),
};
