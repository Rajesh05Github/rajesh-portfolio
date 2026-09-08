/**
 * Picks black or white text over a given background color using the
 * standard WCAG relative-luminance formula — so an admin picking a light
 * `primary` color doesn't accidentally make button text unreadable
 * (white-on-white). Only handles #rgb/#rrggbb hex input, which is all the
 * theme builder's `<input type="color">` fields ever produce.
 */
export function getContrastColor(hex: string): "#000000" | "#ffffff" {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return "#ffffff";

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const linear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const luminance =
    0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

  return luminance > 0.5 ? "#000000" : "#ffffff";
}
