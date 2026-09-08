import { randomBytes, createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { adminSession, adminUser, type AdminUser } from "@/lib/db/schema";
import { SESSION } from "@/lib/config/limits";

export type SessionValidationResult =
  | { session: typeof adminSession.$inferSelect; user: AdminUser }
  | { session: null; user: null };

function generateSessionToken(): string {
  // 32 bytes of entropy — the raw value sent to the browser and never stored (see schema/admin.ts).
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  adminUserId: string,
  meta: { ipAddress?: string; userAgent?: string },
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const id = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION.durationSeconds * 1000);

  await db.insert(adminSession).values({
    id,
    adminUserId,
    expiresAt,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { token, expiresAt };
}

/**
 * Validates a raw session token from the cookie. Returns the session + user
 * only if the session exists, is unrevoked, unexpired, and the account is
 * active — every one of those is a real, separate failure mode worth
 * distinguishing in the future (e.g. a deactivated account vs. an expired
 * session), but callers today only need "authenticated or not".
 *
 * Sliding expiration: a session nearing its expiry is silently extended so
 * an active admin is never logged out mid-session, matching docs/security.md.
 */
export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  const id = hashToken(token);

  const [row] = await db
    .select({ session: adminSession, user: adminUser })
    .from(adminSession)
    .innerJoin(adminUser, eq(adminSession.adminUserId, adminUser.id))
    .where(and(eq(adminSession.id, id), isNull(adminSession.revokedAt)))
    .limit(1);

  if (!row) {
    return { session: null, user: null };
  }

  if (row.session.expiresAt.getTime() <= Date.now() || !row.user.isActive) {
    await db
      .update(adminSession)
      .set({ revokedAt: new Date() })
      .where(eq(adminSession.id, id));
    return { session: null, user: null };
  }

  const msUntilExpiry = row.session.expiresAt.getTime() - Date.now();
  if (msUntilExpiry < SESSION.renewThresholdSeconds * 1000) {
    const expiresAt = new Date(Date.now() + SESSION.durationSeconds * 1000);
    await db
      .update(adminSession)
      .set({ expiresAt })
      .where(eq(adminSession.id, id));
    row.session.expiresAt = expiresAt;
  }

  return { session: row.session, user: row.user };
}

/** Takes the raw session token (as stored in the cookie), not the hashed id. */
export async function invalidateSession(token: string): Promise<void> {
  const id = hashToken(token);
  await db
    .update(adminSession)
    .set({ revokedAt: new Date() })
    .where(eq(adminSession.id, id));
}
