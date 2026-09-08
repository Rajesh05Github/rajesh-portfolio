# ADR-0008: Theme engine — CSS custom-property overrides, not a rebuild

## Problem
The theme builder needs to change colors, typography, layout spacing, and component styling on the public site at runtime, without a redeploy/rebuild per change, without affecting the admin panel's own appearance, and without a live-preview flow that has to round-trip to the server on every keystroke.

## Decision
Tailwind v4 already compiles every utility class through a CSS custom property (verified against the build output — e.g. `.bg-primary{background-color:var(--color-primary)}`, `.rounded-xl{border-radius:var(--radius-xl)}`). The theme engine exploits this directly: `src/lib/theme/apply.ts` turns the active `Theme.config` into an inline `style` object and a handful of `data-*` attributes, applied to a single wrapper element in `(public)/layout.tsx`. No component was rewritten to "consume a theme" — the existing Tailwind classes already do, for free, because of how v4 itself works.

The admin panel is a sibling route group under the same root layout and never receives these overrides, so it keeps a fixed appearance regardless of what the site owner picks (master prompt §104).

The theme builder's live preview (`ThemePreviewPanel`) reuses the exact same `computeThemeStyle`/`computeThemeDataAttributes` functions against in-memory (unsaved) form state — it is not a separate approximation, and it updates with zero network round-trips per keystroke; only "Save" hits the server.

## Two deliberate simplifications vs. the master prompt's literal `ThemeConfig` example
1. **No separate `effects.glass` boolean.** `components.cardStyle` (glass/solid/bordered) already fully covers this — a second overlapping flag would just be a confusing duplicate knob with no independent meaning.
2. **`components.radius` is a named scale** (none/small/medium/large), mapped server-side to Tailwind's actual `--radius-lg/xl/2xl/3xl` variables — not a free-form CSS length. This is impossible to enter as a broken value and maps directly onto the real mechanism, versus a raw text field that would need its own validation/derivation logic for four separate radius steps.

## Tradeoffs
- **Fonts are a curated set, not free text.** `next/font` self-hosts and inlines font files at build time; it has no mechanism to load an admin-typed Google Font name at runtime without either a network request per visitor or losing the self-hosting/no-layout-shift benefit. Three fonts (Inter, Playfair Display, Space Grotesk) are pre-loaded in `src/app/layout.tsx`; the theme picks among them via `src/lib/theme/fonts.ts`. Adding a fourth option is a one-line change there plus a new `next/font` import — not a schema migration.
- **Derived colors (secondary/muted/card background, primary-foreground contrast) are computed in JavaScript** (`src/lib/theme/color-mix.ts`, `contrast.ts`), not via CSS `color-mix()` referencing the admin-edited variables. A custom property's resolved value is fixed wherever it's declared; an inline override further down the tree does not retroactively re-resolve a `color-mix()` expression declared once at `:root`. Computing the mix in JS and setting the derived token directly, alongside the base override, sidesteps that CSS cascade subtlety entirely.
- **`headingWeight` needs `!important`.** Every heading already carries an inline Tailwind `font-bold`/`font-semibold` utility class (utilities outrank `@layer base` by design in Tailwind's cascade layers), which would otherwise silently defeat the theme's heading-weight setting on every section. One `!important` rule in `globals.css` was judged preferable to stripping the weight utility out of nine already-built section components.
