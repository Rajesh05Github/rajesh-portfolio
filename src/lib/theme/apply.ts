import type { CSSProperties } from "react";
import type { ThemeConfig } from "./config";
import { HEADING_FONT_OPTIONS, BODY_FONT_OPTIONS } from "./fonts";
import { RADIUS_SCALES } from "./radius";
import { getContrastColor } from "./contrast";
import { mixHex } from "./color-mix";

export type ThemeDataAttributes = {
  "data-effects-animations": "true" | "false";
  "data-effects-gradients": "true" | "false";
  "data-card-style": ThemeConfig["components"]["cardStyle"];
  "data-button-style": ThemeConfig["components"]["buttonStyle"];
  "data-shadow-style": ThemeConfig["components"]["shadowStyle"];
};

/**
 * Turns a ThemeConfig into inline CSS custom properties + data attributes
 * for a wrapper element. This — not a rebuild — is how theme changes take
 * effect: Tailwind v4 utilities (`bg-primary`, `rounded-xl`, ...) already
 * resolve through these exact CSS variable names (verified against the
 * compiled build output), so overriding them here reshapes every matching
 * utility in the subtree at render time.
 *
 * Colors/radius/fonts the admin doesn't directly edit (secondary, muted,
 * card, secondary-foreground) are derived from the ones above via
 * `color-mix()`/aliasing in globals.css, not computed here — see the
 * "Theme-derived tokens" block in that file.
 */
export function computeThemeStyle(
  config: ThemeConfig,
): CSSProperties & Record<string, string> {
  const radius = RADIUS_SCALES[config.components.radius];

  return {
    "--color-primary": config.colors.primary,
    "--color-primary-foreground": getContrastColor(config.colors.primary),
    "--color-secondary-foreground": config.colors.primary,
    "--color-highlight": config.colors.accent,
    "--color-background": config.colors.background,
    "--color-surface": config.colors.surface,
    "--color-card": config.colors.background,
    // Secondary/muted backgrounds are surface lightened by varying amounts —
    // approximations, not a stored config field (see the module doc comment).
    "--color-secondary": mixHex(config.colors.surface, "#ffffff", 0.93),
    "--color-muted": mixHex(config.colors.surface, "#ffffff", 0.85),
    "--color-foreground": config.colors.text,
    "--color-muted-foreground": config.colors.mutedText,
    "--color-border": config.colors.border,
    "--color-success": config.colors.success,
    "--color-warning": config.colors.warning,
    "--color-error": config.colors.error,

    "--radius-lg": radius.lg,
    "--radius-xl": radius.xl,
    "--radius-2xl": radius["2xl"],
    "--radius-3xl": radius["3xl"],

    "--font-sans": BODY_FONT_OPTIONS[config.typography.bodyFont].cssVar,
    "--font-heading":
      HEADING_FONT_OPTIONS[config.typography.headingFont].cssVar,
    "--font-weight-heading": String(config.typography.headingWeight),
    "--font-weight-body": String(config.typography.bodyWeight),

    "--layout-max-width": config.layout.maxWidth,
    "--layout-section-spacing": config.layout.sectionSpacing,
    "--layout-container-padding": config.layout.containerPadding,
  };
}

/**
 * Light-mode variant of `computeThemeStyle`. Brand/semantic colors (primary,
 * highlight, success/warning/error) and every non-color token (radius,
 * fonts, layout) are identical to the dark version — only the *neutral*
 * palette (background/surface/card/foreground/muted/border) is replaced
 * with fixed light values. We deliberately don't try to auto-invert the
 * admin's arbitrary dark neutrals (e.g. `mixHex(bg, "#fff", x)`); an admin's
 * chosen dark background has no reliable mapping to "the right light
 * background", so a fixed, designed light palette is the honest choice.
 */
const LIGHT_MODE_NEUTRALS = {
  background: "#ffffff",
  surface: "#f4f5f7",
  foreground: "#12161c",
  mutedText: "#5b6472",
  border: "#e2e5ea",
} as const;

export function computeLightThemeStyle(
  config: ThemeConfig,
): CSSProperties & Record<string, string> {
  const dark = computeThemeStyle(config);

  return Object.assign({}, dark, {
    "--color-background": LIGHT_MODE_NEUTRALS.background,
    "--color-surface": LIGHT_MODE_NEUTRALS.surface,
    "--color-card": LIGHT_MODE_NEUTRALS.background,
    // On a near-white surface, secondary/muted need to go slightly darker
    // for contrast — the opposite direction from the dark-mode mix above.
    "--color-secondary": mixHex(LIGHT_MODE_NEUTRALS.surface, "#000000", 0.95),
    "--color-muted": mixHex(LIGHT_MODE_NEUTRALS.surface, "#000000", 0.9),
    "--color-foreground": LIGHT_MODE_NEUTRALS.foreground,
    "--color-muted-foreground": LIGHT_MODE_NEUTRALS.mutedText,
    "--color-border": LIGHT_MODE_NEUTRALS.border,
  }) as CSSProperties & Record<string, string>;
}

export function computeThemeDataAttributes(
  config: ThemeConfig,
): ThemeDataAttributes {
  return {
    "data-effects-animations": config.effects.animations ? "true" : "false",
    "data-effects-gradients": config.effects.gradients ? "true" : "false",
    "data-card-style": config.components.cardStyle,
    "data-button-style": config.components.buttonStyle,
    "data-shadow-style": config.components.shadowStyle,
  };
}
