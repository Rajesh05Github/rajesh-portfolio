import type { NextRequest } from "next/server";

/**
 * Behind a reverse proxy (dev: none; prod: ALB/CloudFront, see
 * docs/deployment.md) the real client IP arrives via x-forwarded-for.
 * Falls back to x-real-ip, then "unknown" — never throws, since rate
 * limiting should degrade, not break the request, if the header is absent.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Lightweight CSRF mitigation for state-changing same-origin routes,
 * layered on top of SameSite=Lax cookies rather than a separate token
 * scheme (docs/security.md §11). Requests with no Origin header (e.g. some
 * same-origin navigations, non-browser API clients using session-less auth)
 * are allowed through — this check only rejects a *mismatched* Origin.
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === request.nextUrl.origin;
}
