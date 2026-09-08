import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { adminUser } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";
import { recordAuditLog } from "@/lib/auth/audit";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, isSameOriginRequest } from "@/lib/security/request";
import { LOGIN_RATE_LIMIT } from "@/lib/config/limits";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

// Computed once, lazily, purely so a login attempt against a non-existent
// email takes the same code path (and roughly the same time) as one against
// a real email with a wrong password — otherwise response timing leaks
// which emails have accounts (docs/security.md §3, §8).
let dummyHash: string | null = null;
async function getDummyHash(): Promise<string> {
  dummyHash ??= await hashPassword("not-a-real-password-used-only-for-timing");
  return dummyHash;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const ip = getClientIp(request);

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email or password format." },
      { status: 400 },
    );
  }
  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const [ipLimit, accountLimit] = await Promise.all([
    checkRateLimit(`login:ip:${ip}`, LOGIN_RATE_LIMIT.perIp),
    checkRateLimit(
      `login:account:${normalizedEmail}`,
      LOGIN_RATE_LIMIT.perAccount,
    ),
  ]);
  if (!ipLimit.allowed || !accountLimit.allowed) {
    await recordAuditLog({
      action: "admin.login_rate_limited",
      metadata: { email: normalizedEmail },
      ipAddress: ip,
    });
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429 },
    );
  }

  const [user] = await db
    .select()
    .from(adminUser)
    .where(eq(adminUser.email, normalizedEmail))
    .limit(1);

  let passwordValid: boolean;
  if (user) {
    passwordValid = await verifyPassword(user.passwordHash, password);
  } else {
    await verifyPassword(await getDummyHash(), password);
    passwordValid = false;
  }

  if (!user || !passwordValid || !user.isActive) {
    await recordAuditLog({
      action: "admin.login_failed",
      metadata: { email: normalizedEmail },
      ipAddress: ip,
    });
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const { token, expiresAt } = await createSession(user.id, {
    ipAddress: ip,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  await db
    .update(adminUser)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUser.id, user.id));
  await recordAuditLog({
    adminUserId: user.id,
    action: "admin.login",
    ipAddress: ip,
  });

  const response = NextResponse.json({ email: user.email, role: user.role });
  setSessionCookie(response, token, expiresAt);
  return response;
}
