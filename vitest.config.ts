import { config } from "dotenv";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// dotenv never overrides an already-set process.env value, so this only
// fills in DATABASE_URL/REDIS_URL when nothing else already has —
// `tests/integration/*` always talks to the dedicated test DB/Redis
// keyspace this file points at, never the dev ones (docs/testing.md §3).
config({ path: ".env.test" });

/**
 * One config for both unit and integration tests (docs/testing.md) — the
 * split is by directory (`tests/unit/*` has no I/O, `tests/integration/*`
 * talks to the real dev-stack Postgres/Redis), not by a separate Vitest
 * project, since the tests already self-select which layer they need by
 * what they import.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // Integration tests share one Postgres connection pool per file but
    // must not run two test FILES concurrently against the same test
    // database — TRUNCATE in one file's beforeEach would wipe rows another
    // file's test is mid-assertion on.
    fileParallelism: false,
  },
});
