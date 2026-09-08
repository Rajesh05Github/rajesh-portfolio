import { NextResponse, type NextRequest } from "next/server";
import { validateSessionToken, invalidateSession } from "@/lib/auth/session";
import { deleteSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { recordAuditLog } from "@/lib/auth/audit";
import { getClientIp, isSameOriginRequest } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const { user } = await validateSessionToken(token);
    await invalidateSession(token);
    await recordAuditLog({
      adminUserId: user?.id ?? null,
      action: "admin.logout",
      ipAddress: getClientIp(request),
    });
  }

  // Redirect (not JSON) — this route is posted to directly by a plain <form>
  // (no client JS required to log out), so the response must be navigable.
  const response = NextResponse.redirect(new URL("/admin/login", request.url), {
    status: 303,
  });
  deleteSessionCookie(response);
  return response;
}
