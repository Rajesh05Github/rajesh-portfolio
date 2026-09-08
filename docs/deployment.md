# Deployment

## 1. Local development (target for now — see project decision log)

```bash
docker compose up
```

brings up Postgres (with `pgvector` extension pre-installed via a custom init image) and Redis. The Next.js app and the worker process run locally (`npm run dev`, `npm run worker:dev`) against those containers — fastest inner loop, no need to containerize the app itself during active development.

`.env.example` documents every variable (`DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `AUTH_SESSION_SECRET`, storage config, AI config) with no real values committed.

## 2. Docker (production-shape image, built and testable locally before any real cloud spend) ✅ Phase 19

One multi-stage `Dockerfile`, four targets selected via `--target`/`docker-compose.prod.yml`'s `build.target`:
1. `deps` — `npm ci` (not a final target — shared by every stage below).
2. `builder` — `next build` (`output: "standalone"` in `next.config.ts`; not a final target either).
3. `runner` — the Next.js app: copies only `.next/standalone` + `.next/static` + `public/` (not the full `node_modules`), runs as a non-root user.
4. `worker` — the BullMQ knowledge-indexing worker, run via `tsx` directly (a normal pattern for a single long-running script, not a dev-only shortcut) rather than a separate compile step.
5. `migrate` — applies Drizzle migrations as a one-off task (`docker compose -f docker-compose.prod.yml run --rm migrate`), never automatically on app/worker startup.

A real, non-obvious build-time gotcha: `next build`'s "collect page data" step imports every route module — including Route Handlers like `/api/resume` — to read its exported config, and `lib/db/client.ts`/`lib/redis/client.ts` throw immediately if `DATABASE_URL`/`REDIS_URL` is missing entirely (a deliberate fail-fast for real runtime misconfiguration, not meant to fire at build time). No page actually opens a DB/Redis connection during the build itself (every page is forced-dynamic), so placeholder, never-connected-to values passed as Docker build args satisfy the check without needing real infrastructure reachable at image-build time.

Separate `docker-compose.yml` (dev: bind-mounted source, hot reload, app/worker run on the host) and `docker-compose.prod.yml` (built images, no bind mounts, restart policies, internal-network Postgres/Redis hostnames) — kept distinct rather than one file with profile flags, since dev and prod have genuinely different concerns (hot reload vs. immutable image). Verified locally: built all four targets, ran migrations against a fresh containerized Postgres, started the app + worker containers, and confirmed the app served real pages (including the correct "no profile configured yet" empty-state, since this was an intentionally unseeded database) and the worker emitted its Phase 17 structured JSON logs correctly under `NODE_ENV=production`.

## 3. Target production architecture (Azure — provisioned only when you're ready, per the local-first decision; see [ADR-0009](decisions/0009-azure-over-aws.md) for why Azure and not AWS)

```
Internet → Azure Front Door (CDN + WAF) → Azure Container Apps (Next.js app, 1-2 replicas)
                                                    |         \
                                                    v          v
                                     Azure Database for      Azure Cache
                                     PostgreSQL Flexible       for Redis
                                     Server (pgvector enabled)
                                                    |
                                                    v
                                    Azure Container Apps (worker, separate container app,
                                                            same environment)
                                                    |
                                                    v
                                                 OpenAI
                  Azure Blob Storage (resume/CV, project images) ← served via Front Door
```

Both the app and the worker images are pushed to **Azure Container Registry (ACR)** — the CI pipeline's Docker-build stage (§4) and Container Apps both point at the same registry.

**Why these specific services, not others** (per master prompt §77, §110 — see [ADR-0009](decisions/0009-azure-over-aws.md) for the full comparison against the AWS equivalents this replaced):
- **Azure Container Apps** over AKS: the app needs a long-lived Node process (streaming responses, a persistent worker) but at 1-2 instances — Container Apps is serverless-container orchestration (scale rules, revisions, no cluster to operate); AKS would be pure operational overhead for a workload this small.
- **Azure Database for PostgreSQL Flexible Server** (with `pgvector`) over a self-managed VM: managed backups/patching/failover for the single most important stateful component, at a scale where the managed-service premium is trivial versus the operational risk of self-managing it.
- **Azure Cache for Redis** over self-hosted Redis: same reasoning — it's the rate-limit/cost-control layer ([ADR-0004](decisions/0004-redis-roles.md)), worth not having to operate by hand.
- **Azure Blob Storage + Azure Front Door** for resume/project images: object storage is the correct place for binary files (§56); Front Door bundles CDN and WAF as one edge service rather than two separate products.
- Explicitly **not** using: a separate vector DB service (see [ADR-0003](decisions/0003-postgres-pgvector.md)), Kafka/Event Hubs (see [ADR-0005](decisions/0005-queue-not-kafka.md)), AKS (Container Apps is sufficient orchestration at 1-2 instances — AKS would be pure operational overhead here).

## 4. CI/CD pipeline (GitHub Actions) ✅ Phase 20

```
push → lint+typecheck+format-check → unit tests → integration tests (service containers: Postgres+pgvector, Redis)
  → build → security checks (npm audit, gitleaks secret scan) → Docker build (both targets)
  → (main branch only, and only when explicitly enabled) push to ACR → deploy to Azure Container Apps → health check
```

Implemented as `.github/workflows/ci.yml`. Every stage before the deploy gate runs on every push and pull request — a failing step blocks the rest of the pipeline, never silently continues (master prompt §78). The deploy job is real, Azure-shaped code (`azure/login`, `az acr build`, `az containerapp update`), not a stub — but it only executes when a repository variable (`vars.AZURE_DEPLOY_ENABLED == 'true'`) is set, since no Azure resources are provisioned yet (Phase 21, TBD). Without that variable the job is skipped with a clear reason, rather than failing on missing secrets — a fork or a clone of this repo shouldn't see a red X for infrastructure it hasn't set up.

This project is not yet a git repository, so the workflow has been reviewed for correctness (YAML structure, action versions, the exact same npm scripts and Docker build-args already verified working locally in Phases 18-19) but has not been executed by GitHub's own runners — that only happens once this repo is pushed somewhere GitHub Actions can see it.

## 5. Database migrations in production

Drizzle Kit migrations are generated in development, committed to the repo, and applied via an explicit `migrate` step in the deploy pipeline (run once, before the new app version receives traffic) — never manual schema edits against the production database. Rollback strategy: migrations are additive-first where possible (add new column nullable → backfill → make non-null in a later migration) so a bad deploy can roll back the app image without needing a destructive down-migration in the same step.

## 6. Realistic capacity note (per master prompt §98)

This architecture (1-2 Container Apps replicas, one small PostgreSQL Flexible Server instance, one small Azure Cache for Redis instance) is sized for a personal-portfolio traffic profile — realistically dozens to low hundreds of concurrent visitors, not internet-scale load. Load testing (Phase 18/19, mocked LLM calls per master prompt §100-101) will produce actual measured numbers for this document once run; until then, no specific concurrent-user capacity is claimed here.
