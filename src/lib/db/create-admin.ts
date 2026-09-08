/**
 * Bootstraps the first (or an additional) admin user. There is no public
 * signup — a single-admin system has no real registration flow to build
 * (docs/decisions/0002-admin-auth.md) — so this script is the only way in.
 *
 * Usage:
 *   npm run admin:create -- --email=you@example.com --password=change-me
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { adminUser } from "./schema";
import { hashPassword } from "../auth/password";

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, "").split("=");
      return [key, rest.join("=")];
    }),
  );
  return { email: args.email, password: args.password };
}

async function main() {
  const { email, password } = parseArgs();

  if (!email || !password) {
    console.error(
      "Usage: npm run admin:create -- --email=you@example.com --password=change-me",
    );
    process.exitCode = 1;
    return;
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exitCode = 1;
    return;
  }

  const [existing] = await db
    .select()
    .from(adminUser)
    .where(eq(adminUser.email, email))
    .limit(1);
  if (existing) {
    console.error(`An admin user with email ${email} already exists.`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);
  await db
    .insert(adminUser)
    .values({ email, passwordHash, role: "SUPER_ADMIN" });

  console.log(`Admin user created: ${email}`);
}

main()
  .catch((error) => {
    console.error("Failed to create admin user:", error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
