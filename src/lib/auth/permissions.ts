import type { AdminUser } from "@/lib/db/schema";

/**
 * Every admin route is written as if RBAC is enforced today, even though
 * only SUPER_ADMIN exists in practice (docs/decisions/0002-admin-auth.md) —
 * introducing EDITOR/ANALYST later means widening this map, not touching
 * every route handler.
 */
export const PERMISSIONS = {
  CONTENT_READ: "content:read",
  CONTENT_WRITE: "content:write",
  THEME_WRITE: "theme:write",
  AI_KNOWLEDGE_WRITE: "ai_knowledge:write",
  ANALYTICS_READ: "analytics:read",
  SECURITY_READ: "security:read",
  SETTINGS_WRITE: "settings:write",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<AdminUser["role"], Set<Permission>> = {
  SUPER_ADMIN: new Set(Object.values(PERMISSIONS)),
  EDITOR: new Set([
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_WRITE,
    PERMISSIONS.THEME_WRITE,
    PERMISSIONS.AI_KNOWLEDGE_WRITE,
  ]),
  ANALYST: new Set([
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.SECURITY_READ,
  ]),
};

export function hasPermission(
  user: Pick<AdminUser, "role">,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[user.role].has(permission);
}

export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

export function requirePermission(
  user: Pick<AdminUser, "role">,
  permission: Permission,
): void {
  if (!hasPermission(user, permission)) {
    throw new ForbiddenError(permission);
  }
}
