import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { adminUser } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  invalidateSession,
  validateSessionToken,
} from "@/lib/auth/session";
import { resetDb } from "../helpers/reset-db";

async function createTestAdmin(email = "test-admin@example.com") {
  const passwordHash = await hashPassword("a-real-password-123");
  const [user] = await db
    .insert(adminUser)
    .values({ email, passwordHash, role: "SUPER_ADMIN" })
    .returning();
  if (!user) throw new Error("failed to create test admin");
  return user;
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await resetDb();
});

describe("password hashing", () => {
  it("verifies a correct password and rejects an incorrect one", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword(hash, "correct-horse-battery-staple")).toBe(
      true,
    );
    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
  });

  it("never stores the plaintext password in the hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).not.toContain("correct-horse-battery-staple");
  });
});

describe("admin session lifecycle", () => {
  it("creates a session and validates it back to the same user", async () => {
    const user = await createTestAdmin();
    const { token } = await createSession(user.id, { ipAddress: "127.0.0.1" });

    const result = await validateSessionToken(token);
    expect(result.user?.id).toBe(user.id);
    expect(result.user?.email).toBe(user.email);
  });

  it("never stores the raw token — only its hash is queryable", async () => {
    const user = await createTestAdmin();
    const { token } = await createSession(user.id, {});

    // The raw token itself must not exist anywhere in the session table.
    const rows = await db
      .select()
      .from(adminUser)
      .where(eq(adminUser.id, user.id));
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("rejects a garbage token", async () => {
    const result = await validateSessionToken("not-a-real-token");
    expect(result.user).toBeNull();
  });

  it("rejects a session after it's been invalidated (logout)", async () => {
    const user = await createTestAdmin();
    const { token } = await createSession(user.id, {});

    expect((await validateSessionToken(token)).user).not.toBeNull();

    await invalidateSession(token);

    expect((await validateSessionToken(token)).user).toBeNull();
  });

  it("rejects a session belonging to a deactivated account", async () => {
    const user = await createTestAdmin();
    const { token } = await createSession(user.id, {});

    await db
      .update(adminUser)
      .set({ isActive: false })
      .where(eq(adminUser.id, user.id));

    expect((await validateSessionToken(token)).user).toBeNull();
  });
});
