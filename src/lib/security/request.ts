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
 * Deliberately does NOT use `request.nextUrl.host` — confirmed via a live
 * diagnostic against the Azure deployment that it resolves to the Next.js
 * standalone server's own bind address (`0.0.0.0:3000`), not the real
 * incoming Host, so every production request failed this check regardless
 * of Origin. `X-Forwarded-Host`/`Host` are the request's own headers as
 * received, unaffected by whatever Next.js does internally, and Azure
 * Container Apps' ingress (like any standard reverse proxy) sets them
 * correctly — verified via the same diagnostic.
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
