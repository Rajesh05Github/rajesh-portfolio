import type { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "admin_session";

/** Never localStorage — HttpOnly + Secure + SameSite (docs/security.md §2, master prompt §36). */
export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export function deleteSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

/** For Server Components (which can only read cookies, not set them). */
export async function getSessionTokenFromCookies(): Promise<
  string | undefined
> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}
