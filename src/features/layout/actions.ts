"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { portfolioSection, type PortfolioSection } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { computeReorderSwap } from "@/lib/db/reorder";

export async function listSections() {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  return db
    .select()
    .from(portfolioSection)
    .orderBy(asc(portfolioSection.displayOrder));
}

export async function toggleSectionVisibility(
  id: string,
  currentlyVisible: boolean,
) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  await db
    .update(portfolioSection)
    .set({ isVisible: !currentlyVisible })
    .where(eq(portfolioSection.id, id));
  await recordAuditLog({
    adminUserId: user.id,
    action: "portfolio_section.visibility",
    targetType: "portfolio_section",
    targetId: id,
    metadata: { isVisible: !currentlyVisible },
  });
  revalidatePath("/admin/layout/sections");
  revalidatePath("/");
}

export async function moveSection(direction: "up" | "down", id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);

  const items: PortfolioSection[] = await db
    .select()
    .from(portfolioSection)
    .orderBy(asc(portfolioSection.displayOrder));
  const swap = computeReorderSwap(items, id, direction);
  if (!swap) return;
  const [a, b] = swap;

  await db.transaction(async (tx) => {
    await tx
      .update(portfolioSection)
      .set({ displayOrder: b.displayOrder })
      .where(eq(portfolioSection.id, a.id));
    await tx
      .update(portfolioSection)
      .set({ displayOrder: a.displayOrder })
      .where(eq(portfolioSection.id, b.id));
  });

  revalidatePath("/admin/layout/sections");
  revalidatePath("/");
}
