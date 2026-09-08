"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { adminUser } from "@/lib/db/schema";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/lib/auth/audit";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation don't match.",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = { error?: string; success?: boolean };

/**
 * Any authenticated admin can change their own password — this isn't gated
 * behind a specific PERMISSIONS constant the way content/theme/security
 * actions are, since managing your own credentials is a baseline account
 * capability, not a role-scoped privilege (unlike, say, SETTINGS_WRITE,
 * which would be for site-wide settings a lesser role might not get).
 *
 * (prevState, formData) — the useActionState shape — rather than throwing,
 * so the form can show "current password is wrong" inline instead of a
 * generic Next.js error overlay.
 */
export async function changeAdminPassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireAdminUser();

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const isCurrentPasswordValid = await verifyPassword(
    user.passwordHash,
    parsed.data.currentPassword,
  );
  if (!isCurrentPasswordValid) {
    return { error: "Current password is incorrect." };
  }

  const newPasswordHash = await hashPassword(parsed.data.newPassword);
  await db
    .update(adminUser)
    .set({ passwordHash: newPasswordHash })
    .where(eq(adminUser.id, user.id));

  await recordAuditLog({
    adminUserId: user.id,
    action: "admin.change_password",
    targetType: "admin_user",
    targetId: user.id,
  });

  return { success: true };
}
