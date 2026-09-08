# Testing

## 1. Why now

Every phase through 17 was verified live — manually, through the browser, against a real running dev stack. That's real verification, but it doesn't survive a future change silently breaking something already working. Phase 18 is the first phase whose actual deliverable is automated tests, not application features.

## 2. Three layers

| Layer | Tool | What it covers | Talks to |
|---|---|---|---|
| Unit | Vitest (`tests/unit/`) | Pure business logic — no I/O | Nothing external |
| Integration | Vitest (`tests/integration/`) | DB/Redis-backed feature code | The dedicated `advportfolio_test` database and Redis db index 1 |
| E2E | Playwright (`tests/e2e/`) | Full user flows through a real browser | The real dev stack (`npm run dev`, the real Docker Compose Postgres/Redis, real OpenAI calls) |

No mocking layer exists for OpenAI, Postgres, or Redis at any layer — a "test" that mocks the database isn't testing this app's actual behavior (docs/security.md's own reasoning for why integration tests must hit a real database applies here too). What's mocked is scope, not infrastructure: unit tests simply don't import anything that touches I/O.

## 3. Running the tests

```bash
npm test                # unit — fast, no setup required
npm run test:integration  # integration — requires the dev Docker Compose stack running
npm run test:e2e        # e2e — requires `npx playwright install` once, plus the dev stack
```

One-time integration test setup (creates a dedicated `advportfolio_test` database on the same Postgres container `docker-compose.yml` already runs, with the `vector` extension and all migrations applied — never touches the real dev database):

```bash
npm run db:test:setup
```

`.env.test` points integration tests at that database and at Redis db index **1** (not 0, which the real dev app uses) on the same Redis container — `tests/helpers/reset-db.ts`'s `TRUNCATE` and the rate-limit tests' `FLUSHDB` only ever touch that isolated keyspace. `resetDb()` additionally refuses to run at all unless `DATABASE_URL` contains `advportfolio_test`, as a second guard beyond "trust the env file."

E2E tests need a real browser binary Playwright doesn't ship with the npm package — `npx playwright install chromium` downloads it once. (That download was blocked by this sandbox's network policy while this phase was built, so the suite is written and typechecked but was never executed here — run it yourself once the browser is installed.)

## 4. What's covered

- **Unit**: theme color math (`getContrastColor`, `mixHex`), token/cost estimation, and every pure LangGraph node (`securityCheckNode`'s prompt-injection patterns, `validateNode`'s grounding heuristic and leak detection, the canned response nodes) — the nodes that make real OpenAI calls (`classifyIntentNode`, `retrieveNode`, `generateNode`) are exercised live instead (the admin `/admin/ai/chat-test` tool, and end-to-end by the e2e chatbot spec), not mocked, since mocking the LLM response would test the mock, not the graph's real behavior.
- **Integration**: password hashing + the full admin session lifecycle (create → validate → logout-invalidates → deactivated-account-rejects), the chat-session feature's DB-only functions, and the rate limiter's fixed-window/TTL/token-amount behavior against real Redis.
- **E2E**: admin login (success, failure, logout, auth redirect), editing content (About) and seeing it reflected on the public site, activating a theme preset and confirming the public site's CSS variables change, reordering sections, the chatbot widget's full skip-gate → suggested-question → streamed-answer flow and its prompt-injection rejection path, and the CV download endpoint (skipped cleanly when no resume is active, per Phase 7's designed behavior).

## 5. What's deliberately not covered

- The RAG retrieval pipeline itself (`hybridSearch`, embeddings, reranking) has no automated test — every real test run would cost real OpenAI tokens for embedding generation, and the pipeline is already exercised live via `/admin/ai/rag-test`, the evaluation runner (Phase 16), and the e2e chatbot spec's indirect coverage. A future CI-triggered evaluation run (docs/evaluation.md §7) is the more honest way to catch a retrieval regression than a unit test with a hand-faked embedding vector.
- Drag-and-drop: there isn't any — section reordering uses up/down buttons (`components/admin/order-buttons.tsx`), a deliberate simplicity choice from Phase 5 that also makes it trivially testable without a DnD library or DnD-specific test tooling.
- Load/performance testing, visual regression testing, and cross-browser testing (only Chromium is configured) — none of these have a real driving need yet at this project's stage.
