import { db } from "@/lib/db/client";
import { abuseEvent } from "@/lib/db/schema";

export type AbuseEventKind =
  | "RATE_LIMIT"
  | "TOKEN_LIMIT"
  | "PROMPT_INJECTION"
  | "OVERSIZED_INPUT"
  | "OTHER";

export type RecordAbuseEventInput = {
  sessionId?: string;
  ipHash?: string;
  kind: AbuseEventKind;
  detail?: string;
};

/** The one write path for `AbuseEvent` (docs/security.md §8) — every rate-limit/token-budget rejection and every graph-detected abuse route logs exactly one row here, so the admin security dashboard reflects real violations, not a sample. */
export async function recordAbuseEvent(
  input: RecordAbuseEventInput,
): Promise<void> {
  await db.insert(abuseEvent).values({
    sessionId: input.sessionId,
    ipHash: input.ipHash,
    kind: input.kind,
    detail: input.detail,
  });
}
