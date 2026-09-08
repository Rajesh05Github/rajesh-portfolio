import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

/**
 * Truncates every table in the test database's `public` schema — generated
 * from `pg_tables` rather than a hand-maintained list, so it never silently
 * misses a table added by a later migration. Safe only because
 * `DATABASE_URL` is guaranteed to point at `advportfolio_test`
 * (`.env.test`, loaded by `vitest.config.ts`) — never call this against the
 * real dev database.
 */
export async function resetDb(): Promise<void> {
  // A second, cheap safety net beyond "trust .env.test" — refuses to run
  // against anything whose connection string doesn't look like the test DB.
  if (!process.env.DATABASE_URL?.includes("advportfolio_test")) {
    throw new Error(
      "resetDb() refused to run: DATABASE_URL does not look like the test database.",
    );
  }

  const rows = (await db.execute(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  )) as unknown as { tablename: string }[];
  const names = rows.map((t) => `"${t.tablename}"`).join(", ");
  if (names.length === 0) return;
  await db.execute(sql.raw(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`));
}
