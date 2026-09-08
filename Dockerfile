# Multi-stage build (docs/deployment.md §2). Two things get built from the
# same `deps`/`builder` stages and selected via `--target`:
#   docker build --target runner ...  -> the Next.js app
#   docker build --target worker ...  -> the BullMQ background workers (knowledge indexing, chat retention)
# They share one image lineage (same deps, same source) rather than two
# separate Dockerfiles, since duplicating the deps/builder stages would just
# be two copies of the same npm ci + next build to keep in sync.
#
# Node version matches this project's actual development Node version
# (v24) rather than an arbitrarily older LTS — no reason to test against a
# runtime nobody's actually developing against.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No page actually connects to Postgres/Redis during `next build` (every
# page under `(public)`/`admin` is forced-dynamic, per Phase 5/13) — but
# Next's build-time "collect page data" step still *imports* every route
# module (including Route Handlers like `/api/resume`) to read its exported
# config, and `lib/db/client.ts`/`lib/redis/client.ts` throw at import time
# if the env var is missing entirely (a deliberate fail-fast for real
# runtime misconfiguration — not meant to fire at build time). Placeholder,
# never-connected-to values satisfy that check; the real values come from
# `docker-compose.prod.yml`'s `environment:` at container start.
ARG DATABASE_URL=postgresql://placeholder:placeholder@placeholder:5432/placeholder
ARG REDIS_URL=redis://placeholder:6379
ENV DATABASE_URL=$DATABASE_URL
ENV REDIS_URL=$REDIS_URL
RUN npm run build

# --- Runner: the Next.js app ---
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Standalone output deliberately does NOT include `public/` or
# `.next/static/` (Next's own documented standalone behavior) — copied in
# explicitly here, same as Next's own reference Dockerfile.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]

# --- Worker: every BullMQ background worker (workers/index.ts starts them
# all in one process — knowledge indexing, chat retention) ---
# Runs via `tsx` directly rather than a separate compile step — the worker
# is a single entry-point script with no bundling/tree-shaking need the way
# the Next.js app has; `tsx` in production for a long-running single script
# is a normal, supported pattern, not a dev-only shortcut.
FROM node:24-alpine AS worker
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs package.json ./
COPY --chown=nextjs:nodejs src ./src
COPY --chown=nextjs:nodejs tsconfig.json ./

USER nextjs
CMD ["npx", "tsx", "src/workers/index.ts"]

# --- Migrate: applies Drizzle migrations, run as a one-off task before the
# new app/worker version receives traffic (docs/deployment.md §5), never as
# a side effect of the app or worker starting up. ---
FROM node:24-alpine AS migrate
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs package.json drizzle.config.ts ./
COPY --chown=nextjs:nodejs drizzle ./drizzle
COPY --chown=nextjs:nodejs src/lib/db/schema ./src/lib/db/schema

USER nextjs
CMD ["npx", "drizzle-kit", "migrate"]
