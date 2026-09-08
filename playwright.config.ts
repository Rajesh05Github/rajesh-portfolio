import { defineConfig, devices } from "@playwright/test";

/**
 * E2E suite (docs/testing.md §4) — runs against a real `npm run dev`
 * server the Playwright test runner starts itself, talking to the same
 * Docker Compose Postgres/Redis every other phase has used all along.
 * There is no mocking layer for the chatbot tests: a real OpenAI call
 * happens, same as every other manual verification this project has done
 * since Phase 13 — small, deliberate real cost, not a hidden one.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
