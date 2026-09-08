# ADR-0009: Azure, not AWS, as the target cloud

## Problem
`docs/deployment.md` §3 originally targeted AWS (ECS Fargate, RDS Postgres, ElastiCache, S3+CloudFront, WAF), matching the master prompt's own example architecture. Phase 20 (CI/CD) needs a real deploy target for its final pipeline stage, and the user explicitly asked for this build to target Azure instead.

## Decision
Azure Container Apps, Azure Database for PostgreSQL Flexible Server (`pgvector` enabled), Azure Cache for Redis, Azure Blob Storage + Azure Front Door, Azure Container Registry. `docs/deployment.md` §3 is rewritten around these rather than kept as a stale AWS section alongside a new Azure one — one target architecture, not two competing ones.

## Why each service (same reasoning shape as the original AWS section, per master prompt §77, §110 — pick the smallest managed service that fits, name what's explicitly rejected and why)

- **Azure Container Registry (ACR)** for the Docker images Phase 19 builds — the direct Azure counterpart to ECR; Container Apps pulls from it directly.
- **Azure Container Apps** over AKS: the app needs a long-lived Node process (streaming responses, a persistent worker) but at 1-2 instances — Container Apps is serverless-container orchestration (scale rules, revisions, no cluster to operate) at exactly this scale; AKS would be pure operational overhead for a workload this small, same reasoning as rejecting EKS in the AWS version of this decision. Container Apps also natively supports **KEDA-based scaling and multiple container "apps" from one environment**, which maps cleanly onto running the Next.js app and the BullMQ worker as two separate Container Apps sharing one environment/VNet.
- **Azure Database for PostgreSQL Flexible Server** over a self-managed Postgres on a VM: managed backups/patching/failover for the single most important stateful component; Flexible Server supports the `vector` extension (via its allow-listed extensions mechanism), so [ADR-0003](0003-postgres-pgvector.md)'s pgvector decision carries over unchanged — no vector-DB migration forced by the cloud switch.
- **Azure Cache for Redis** over self-hosted Redis: same reasoning as ElastiCache in the AWS version — it backs rate-limiting/token-budget counters ([ADR-0004](0004-redis-roles.md)), worth not operating by hand.
- **Azure Blob Storage** for resume/CV and project images, fronted by **Azure Front Door** (CDN + WAF in one service, rather than separate CDN and WAF products) — object storage is still the correct place for binary files; Front Door's combined CDN+WAF is a more direct match to "one edge layer" than AWS's separate CloudFront+WAF pairing, not a downgrade.
- Explicitly **not** using: AKS (see above), Azure Functions for the app itself (same reason Lambda was rejected — a persistent worker and streaming responses don't fit a request/response execution model), Cosmos DB or any non-Postgres datastore (no requirement here isn't already served by Postgres+pgvector).

## What doesn't change
Everything below the infrastructure layer is cloud-agnostic and untouched by this decision: the Dockerfile (Phase 19), the app code, Drizzle migrations, the RAG/chat pipeline, and the CI pipeline's lint/typecheck/test/build/security-scan stages (Phase 20) — only the final "push image, update the running service" deploy step is Azure-specific (`az acr build`, `az containerapp update`).

## Status
Architecture target only — no Azure resources are actually provisioned yet (this project remains local-first, per the Phase 1 decision log; real provisioning is Phase 21, via Bicep or Terraform, TBD at that point). The CI pipeline's deploy job is written against this target but gated behind a repository variable so it doesn't attempt real Azure calls until that infrastructure exists and its credentials are configured.
