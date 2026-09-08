import "server-only";
import { redirect } from "next/navigation";
import type { AdminUser } from "@/lib/db/schema";
import { getSessionTokenFromCookies } from "./cookies";
import { validateSessionToken } from "./session";
import { hasPermission, type Permission } from "./permissions";

/**
 * For Server Components / Server Actions under /admin. Server Actions have
 * no middleware layer of their own, so every mutating action must re-check
 * auth itself — this is the one place that logic lives (docs/security.md §2).
 */
export async function requireAdminUser(): Promise<AdminUser> {
  const token = await getSessionTokenFromCookies();
  const { user } = token ? await validateSessionToken(token) : { user: null };
  if (!user) {
    redirect("/admin/login");
  }
  return user;
}

/** For Route Handlers, which can't redirect the way a page can — returns null instead of throwing/redirecting so the caller can return a 401 JSON response. */
export async function getAdminUserForApi(): Promise<AdminUser | null> {
  const token = await getSessionTokenFromCookies();
  const { user } = token ? await validateSessionToken(token) : { user: null };
  return user;
}

/** Throws (rather than redirecting) — for use inside Server Actions, where a thrown error surfaces as a form error. */
export async function requirePermissionInAction(
  permission: Permission,
): Promise<AdminUser> {
  const token = await getSessionTokenFromCookies();
  const { user } = token ? await validateSessionToken(token) : { user: null };
  if (!user) {
    throw new Error("Not authenticated.");
  }
  if (!hasPermission(user, permission)) {
    throw new Error("Not authorized.");
  }
  return user;
}
