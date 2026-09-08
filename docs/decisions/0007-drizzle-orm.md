# ADR-0007: Drizzle ORM over Prisma

## Problem
We need type-safe Postgres access from TypeScript, first-class migration tooling, and — specifically — a clean way to model a `vector` column (`pgvector`) alongside normal relational columns, plus raw SQL escape hatches for hybrid-search queries (vector distance operator + `tsvector` rank in one query).

## Options
1. Prisma ORM.
2. Drizzle ORM.
3. Raw `pg`/`postgres.js` with hand-written SQL and manual types.

## Decision
Drizzle ORM.

## Why
- Drizzle has a native `vector` column type and composes cleanly with raw SQL fragments (`sql\`...\``) needed for the hybrid retrieval query (cosine distance + full-text rank in one `SELECT`) — Prisma has no first-class `pgvector` support and would need raw queries for anything vector-related anyway, at which point Drizzle's SQL-like query builder is a better fit throughout.
- Drizzle's query builder is close to SQL (not a separate DSL/schema language like Prisma's `.prisma` file), which is more transparent for learning purposes — you can see and reason about the actual generated SQL.
- Lighter runtime, no separate codegen step blocking `dev` (Prisma requires `prisma generate`); Drizzle Kit handles migrations from the same TypeScript schema files used at runtime.

## Tradeoffs
- Prisma's ecosystem/tooling (Prisma Studio, broader community examples) is larger — acceptable trade for correct, first-class vector support and closer-to-SQL transparency.
- Drizzle's relational query API is younger than Prisma's — mitigated by keeping most complex queries as explicit `sql` builder calls in `lib/db`, which is the intended, well-supported pattern for this ORM.
