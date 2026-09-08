import { lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chatSession } from "@/lib/db/schema";
import { CHAT_RETENTION_DAYS } from "@/lib/config/limits";

/**
 * Deletes every chat session whose last activity is older than
 * `CHAT_RETENTION_DAYS` — their messages go with them via `chatMessage`'s
 * `onDelete: "cascade"` FK (lib/db/schema/chat.ts), so this one delete is
 * the entire purge. Cutoff is `lastActivityAt`, not `createdAt`: a
 * long-running conversation should be judged by how recently it was
 * touched, not when it started.
 *
 * No `import "server-only"` — called from the standalone worker process
 * (workers/chat-retention-worker.ts), which runs outside Next.js entirely,
 * the same constraint as lib/queue/connection.ts.
 */
export async function purgeExpiredChatSessions(): Promise<number> {
  const cutoff = new Date(
    Date.now() - CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const deleted = await db
    .delete(chatSession)
    .where(lt(chatSession.lastActivityAt, cutoff))
    .returning({ id: chatSession.id });
  return deleted.length;
}
