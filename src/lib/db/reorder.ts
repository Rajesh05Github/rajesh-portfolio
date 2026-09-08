/**
 * Shared "what should swap" logic behind the admin up/down reorder buttons
 * (docs/admin UX — drag-and-drop deferred, see components/admin/order-buttons.tsx).
 * Each feature's server action still does its own two-row DB update (in a
 * transaction, using its own table) — this only computes which pair swaps.
 */
export function computeReorderSwap<
  T extends { id: string; displayOrder: number },
>(sortedItems: T[], targetId: string, direction: "up" | "down"): [T, T] | null {
  const index = sortedItems.findIndex((item) => item.id === targetId);
  if (index === -1) return null;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= sortedItems.length) return null;

  return [sortedItems[index]!, sortedItems[swapIndex]!];
}
