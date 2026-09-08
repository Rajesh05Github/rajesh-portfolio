/**
 * One-time (and idempotent — safe to re-run) setup for the dedicated
 * integration-test database `tests/integration/*` talks to
 * (docs/testing.md §3). Reads `.env.test`'s `DATABASE_URL` directly rather
 * than relying on shell syntax to override an env var, so `npm run
 * db:test:setup` works identically in PowerShell, cmd, and bash.
 *
 * Usage: npm run db:test:setup
 */
import { execSync } from "node:child_process";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.test" });

async function main() {
  const testUrl = process.env.DATABASE_URL;
  if (!testUrl) {
    throw new Error(".env.test has no DATABASE_URL — nothing to set up.");
  }

  const testDbName = new URL(testUrl).pathname.replace(/^\//, "");
  if (!testDbName.includes("test")) {
    throw new Error(
      `Refusing to run: "${testDbName}" doesn't look like a test database name.`,
    );
  }

  const maintenanceUrl = testUrl.replace(`/${testDbName}`, "/postgres");
  const maintenanceSql = postgres(maintenanceUrl, { max: 1 });

  try {
    await maintenanceSql.unsafe(`CREATE DATABASE ${testDbName}`);
    console.log(`Created database "${testDbName}".`);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "42P04") {
      console.log(`Database "${testDbName}" already exists — continuing.`);
    } else {
      throw error;
    }
  } finally {
    await maintenanceSql.end();
  }

  const testSql = postgres(testUrl, { max: 1 });
  await testSql.unsafe("CREATE EXTENSION IF NOT EXISTS vector");
  await testSql.end();
  console.log("pgvector extension ready.");

  execSync("npx drizzle-kit migrate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
  console.log(`Test database "${testDbName}" is ready.`);
}

main().catch((error) => {
  console.error("Test database setup failed:", error);
  process.exitCode = 1;
});
