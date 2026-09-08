/**
 * Simple linear hex color mixing, computed server-side rather than via CSS
 * `color-mix()`. Reason: derived tokens (secondary, muted, card) are
 * expressed as a mix of *other* theme colors (surface, background) — if
 * that mix were declared once as CSS at `:root` referencing `var(--color-
 * surface)`, it would resolve using :root's default surface value, and an
 * inline override of `--color-surface` further down the tree would NOT
 * retroactively change it (a custom property's resolved value is fixed
 * where it's declared, not re-resolved by descendant overrides of the vars
 * it referenced). Computing the mix in JS and setting the derived token
 * directly, alongside the base override, sidesteps that entirely.
 */
function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function toHex(n: number): string {
  return Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, "0");
}

/** weightA=0.7 means 70% colorA, 30% colorB. */
export function mixHex(
  colorA: string,
  colorB: string,
  weightA: number,
): string {
  const [ar, ag, ab] = hexToRgb(colorA);
  const [br, bg, bb] = hexToRgb(colorB);
  const r = ar * weightA + br * (1 - weightA);
  const g = ag * weightA + bg * (1 - weightA);
  const b = ab * weightA + bb * (1 - weightA);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
