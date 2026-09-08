# ADR-0001: Next.js App Router as the single application shell

## Problem
We need routing, SSR/SSG for SEO, an API layer for chat/admin/CMS mutations, image optimization, and a place to run server-only code (DB/Redis/OpenAI clients) without exposing secrets to the browser — for both a public portfolio and an admin CMS.

## Options
1. Next.js App Router, single app, Route Handlers for the API.
2. Next.js Pages Router.
3. Separate SPA (Vite, as today) + separate Node/Express API.
4. Next.js frontend + separate NestJS backend service.

## Decision
Next.js 15 App Router, single deployable, Route Handlers under `app/api/*` for all server logic (public chat/read APIs and protected admin APIs).

## Why
- Server Components let the portfolio pages fetch directly from Postgres with zero client-side data fetching or waterfall — best for SEO and performance.
- One deployable process is simpler to run, Dockerize, and deploy for a portfolio-scale project than a split frontend/backend.
- App Router's route groups (`(public)`, `admin`) give a clean way to separate the two audiences and their auth boundaries without separate apps.
- Route Handlers are sufficient for this project's API surface (chat, CMS CRUD, resume upload) — a dedicated backend framework (NestJS) would add ceremony (modules/DI/decorators) without new capability at this scale.

## Tradeoffs
- App Router's caching model (fetch cache, route segment config) has a learning curve and occasional surprises — mitigated by being explicit about `revalidate`/`dynamic` on every route.
- Mixing public and admin concerns in one app means deploy coupling (a bug in admin code could theoretically affect the public build) — mitigated by strict module boundaries (`features/*`) and route-level auth middleware, not process isolation.
