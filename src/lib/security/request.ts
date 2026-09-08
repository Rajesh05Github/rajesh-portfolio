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
 *
 * Compares hostnames only, not full origins (protocol + host) — behind a
 * TLS-terminating reverse proxy (Azure Container Apps' ingress, any
 * standard load balancer setup), the proxy-to-container hop is plain HTTP,
 * so Next.js's own `request.nextUrl` resolves to `http://`, while a real
 * browser's Origin header correctly says `https://`. Comparing full origins
 * rejects every legitimate request in that (extremely common) deployment
 * shape; a protocol downgrade isn't the thing this check exists to catch.
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}
