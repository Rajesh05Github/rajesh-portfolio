import type { ThemeConfig } from "./config";

/**
 * A curated set of pre-loaded fonts, not arbitrary Google Fonts input.
 * next/font self-hosts and inlines font files at build time — it has no
 * mechanism for loading an admin-typed font name at runtime without either
 * a network request per visitor or losing the self-hosting/no-layout-shift
 * benefits. Each entry here maps to a `next/font` variable declared once in
 * src/app/layout.tsx; the theme just picks among them.
 */
export const HEADING_FONT_OPTIONS: Record<
  ThemeConfig["typography"]["headingFont"],
  { label: string; cssVar: string }
> = {
  playfair: {
    label: "Playfair Display (serif)",
    cssVar: "var(--font-playfair)",
  },
  inter: { label: "Inter (sans)", cssVar: "var(--font-inter)" },
  spaceGrotesk: {
    label: "Space Grotesk (sans, geometric)",
    cssVar: "var(--font-space-grotesk)",
  },
};

export const BODY_FONT_OPTIONS: Record<
  ThemeConfig["typography"]["bodyFont"],
  { label: string; cssVar: string }
> = {
  inter: { label: "Inter", cssVar: "var(--font-inter)" },
  spaceGrotesk: { label: "Space Grotesk", cssVar: "var(--font-space-grotesk)" },
};
