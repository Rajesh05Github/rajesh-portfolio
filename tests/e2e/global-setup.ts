import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db/client";
import { adminUser } from "../../src/lib/db/schema";
import { hashPassword } from "../../src/lib/auth/password";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./constants";

/** Runs once before the whole e2e suite (`playwright.config.ts`'s `globalSetup`) — idempotent, so re-running the suite never fails on "user already exists." Uses relative imports rather than the `@/` alias since this file runs directly under `tsx`/Playwright's own loader, outside Next.js's own path-alias resolution. */
export default async function globalSetup(): Promise<void> {
  const passwordHash = await hashPassword(E2E_ADMIN_PASSWORD);
  const [existing] = await db
    .select()
    .from(adminUser)
    .where(eq(adminUser.email, E2E_ADMIN_EMAIL))
    .limit(1);

  if (existing) {
    await db
      .update(adminUser)
      .set({ passwordHash, isActive: true })
      .where(eq(adminUser.id, existing.id));
  } else {
    await db
      .insert(adminUser)
      .values({ email: E2E_ADMIN_EMAIL, passwordHash, role: "SUPER_ADMIN" });
  }
}
