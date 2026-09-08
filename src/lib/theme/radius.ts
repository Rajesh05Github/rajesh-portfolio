import type { ThemeConfig } from "./config";

/**
 * Tailwind v4 generates `.rounded-xl { border-radius: var(--radius-xl) }`
 * etc. (verified against the compiled build output) — overriding these
 * variables on an ancestor element genuinely reshapes every `rounded-*`
 * usage in that subtree, with zero component changes needed. "medium"
 * matches Tailwind's own default scale (the site's current look).
 */
export const RADIUS_SCALES: Record<
  ThemeConfig["components"]["radius"],
  { lg: string; xl: string; "2xl": string; "3xl": string }
> = {
  none: { lg: "0px", xl: "0px", "2xl": "0px", "3xl": "0px" },
  small: { lg: "0.25rem", xl: "0.375rem", "2xl": "0.5rem", "3xl": "0.75rem" },
  medium: { lg: "0.5rem", xl: "0.75rem", "2xl": "1rem", "3xl": "1.5rem" },
  large: { lg: "0.75rem", xl: "1.25rem", "2xl": "1.75rem", "3xl": "2.5rem" },
};
