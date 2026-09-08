import { z } from "zod";

/**
 * The full theme config, stored as jsonb on `theme`/`theme_preset` rows.
 * Adapted from the master prompt's ThemeConfig example (docs/architecture.md
 * §13-16) with two deliberate simplifications, documented here rather than
 * silently: (1) no separate `effects.glass` boolean — `components.cardStyle`
 * already covers glass/solid/bordered, and a second overlapping flag would
 * just be a confusing duplicate knob; (2) `components.radius` is a named
 * scale (none/small/medium/large) mapped to Tailwind's actual `--radius-*`
 * scale server-side, not a free-form CSS length — simpler to validate and
 * impossible to enter a broken value.
 */
export const themeConfigSchema = z.object({
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
    surface: z.string(),
    text: z.string(),
    mutedText: z.string(),
    border: z.string(),
    success: z.string(),
    warning: z.string(),
    error: z.string(),
  }),
  typography: z.object({
    headingFont: z.enum(["inter", "playfair", "spaceGrotesk"]),
    bodyFont: z.enum(["inter", "spaceGrotesk"]),
    headingWeight: z.number().int().min(100).max(900),
    bodyWeight: z.number().int().min(100).max(900),
  }),
  layout: z.object({
    maxWidth: z.string(),
    sectionSpacing: z.string(),
    containerPadding: z.string(),
  }),
  components: z.object({
    radius: z.enum(["none", "small", "medium", "large"]),
    buttonStyle: z.enum(["solid", "outline", "ghost"]),
    cardStyle: z.enum(["glass", "solid", "bordered"]),
    shadowStyle: z.enum(["none", "soft", "glow"]),
  }),
  effects: z.object({
    animations: z.boolean(),
    gradients: z.boolean(),
  }),
});

export type ThemeConfig = z.infer<typeof themeConfigSchema>;

/** Matches the hand-authored defaults currently in globals.css — activating this preset is a visual no-op. */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  colors: {
    primary: "#20b2a6",
    secondary: "#1f2830",
    accent: "#f5a623",
    background: "#0f1418",
    surface: "#1a2329",
    text: "#f0f2f5",
    mutedText: "#7a8491",
    border: "#242b32",
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
  },
  typography: {
    // "inter", not "playfair" — the reference design's serif treatment was
    // always scoped to the italic accent phrase within a heading (the
    // `.font-serif` span each section still renders regardless of this
    // setting), never the whole heading. Defaulting headingFont to
    // "playfair" would make every h1/h2/h3 site-wide render serif, which is
    // a real visual regression versus the current design, not a no-op.
    headingFont: "inter",
    bodyFont: "inter",
    headingWeight: 700,
    bodyWeight: 400,
  },
  layout: {
    maxWidth: "80rem",
    sectionSpacing: "8rem",
    containerPadding: "1.5rem",
  },
  components: {
    radius: "medium",
    buttonStyle: "solid",
    cardStyle: "glass",
    shadowStyle: "soft",
  },
  effects: {
    animations: true,
    gradients: true,
  },
};

/** A second seeded preset, demonstrating the theme system actually varies things: flat/bordered cards, no glow, sharper radius, restrained palette. */
export const MINIMAL_THEME_CONFIG: ThemeConfig = {
  colors: {
    primary: "#3b82f6",
    secondary: "#1e2530",
    accent: "#94a3b8",
    background: "#111318",
    surface: "#1a1d24",
    text: "#e5e7eb",
    mutedText: "#8a8f98",
    border: "#2a2e37",
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
  },
  typography: {
    headingFont: "spaceGrotesk",
    bodyFont: "inter",
    headingWeight: 600,
    bodyWeight: 400,
  },
  layout: {
    maxWidth: "72rem",
    sectionSpacing: "6rem",
    containerPadding: "1.5rem",
  },
  components: {
    radius: "small",
    buttonStyle: "outline",
    cardStyle: "bordered",
    shadowStyle: "none",
  },
  effects: {
    animations: true,
    gradients: false,
  },
};

/** A third seeded preset: near-black background with a bright green primary/accent, glowing glass cards — matches the reference "world advancing software" hero design. */
export const EMERALD_THEME_CONFIG: ThemeConfig = {
  colors: {
    primary: "#39e75f",
    secondary: "#16321f",
    accent: "#39e75f",
    background: "#0a0d0a",
    surface: "#12170f",
    text: "#f2f7f0",
    mutedText: "#8a978a",
    border: "#1e2a1c",
    success: "#39e75f",
    warning: "#f59e0b",
    error: "#ef4444",
  },
  typography: {
    headingFont: "inter",
    bodyFont: "inter",
    headingWeight: 700,
    bodyWeight: 400,
  },
  layout: {
    maxWidth: "80rem",
    sectionSpacing: "8rem",
    containerPadding: "1.5rem",
  },
  components: {
    radius: "large",
    buttonStyle: "solid",
    cardStyle: "glass",
    shadowStyle: "glow",
  },
  effects: {
    animations: true,
    gradients: true,
  },
};
