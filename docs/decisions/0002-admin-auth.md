# ADR-0002: Custom cookie-session admin authentication (no NextAuth/OAuth)

## Problem
There is exactly one admin user (the portfolio owner) today, with room to grow into RBAC later. Auth must never leak tokens to `localStorage`, must support brute-force protection, and must be fully separate from the public visitor/chatbot experience.

## Options
1. NextAuth.js / Auth.js with a credentials provider.
2. Third-party identity provider (Clerk, Auth0, Cognito).
3. Custom session-based auth: argon2 password hash, opaque session token in an HttpOnly/Secure/SameSite cookie, session row in Postgres, hot-path lookup cached in Redis.

## Decision
Option 3 — custom session auth.

## Why
- A single-admin system has no real multi-provider/social-login requirement — NextAuth and third-party IdPs solve problems (OAuth flows, multiple providers, consumer-scale user management) this project doesn't have.
- Full control over session storage (`AdminSession` table: id, userId, expiresAt, ip, userAgent, createdAt) makes audit logging, forced logout, and session-expiry policy straightforward and explicit — valuable both operationally and as a demonstrable skill (this is the "auth/authorization" learning objective from the brief).
- argon2id for password hashing (memory-hard, current best practice) instead of bcrypt.
- Cookie is HttpOnly + Secure + SameSite=Lax, session ID is opaque (not a JWT) so it can be revoked server-side instantly — a JWT-based approach would need a revocation list anyway, which is the same complexity with less flexibility.
- RBAC-ready: `AdminUser.role` enum (`SUPER_ADMIN` initially, `EDITOR`/`ANALYST` reserved) is added from day one so introducing more roles later is a data change, not a schema migration.

## Tradeoffs
- We own brute-force protection, rate limiting on `/admin/login`, and session cleanup — more code than "install NextAuth," but it is a small, well-understood surface (one login form, one user table).
- No social login / passkeys initially — acceptable since there is one known user; can be added later without changing the session model.
