"use client";

import type { ThemeConfig } from "@/lib/theme/config";
import {
  computeThemeStyle,
  computeThemeDataAttributes,
} from "@/lib/theme/apply";

/**
 * Reuses the exact same computeThemeStyle/computeThemeDataAttributes
 * functions the real (public) layout uses (src/lib/theme/apply.ts) — this
 * preview isn't a separate approximation of the theme mechanism, it's the
 * real mechanism, scoped to a small mock instead of the whole page. Updates
 * instantly from client state, no server round-trip per keystroke.
 */
export function ThemePreviewPanel({ config }: { config: ThemeConfig }) {
  return (
    <div
      className="border-border overflow-hidden rounded-2xl border"
      style={{
        ...computeThemeStyle(config),
        backgroundColor: "var(--color-background)",
      }}
      {...computeThemeDataAttributes(config)}
    >
      <div className="section-py container-themed relative space-y-6 !py-10">
        <div className="decorative-glow bg-primary/10 absolute top-0 right-0 h-40 w-40 rounded-full blur-3xl" />

        <span className="glass relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-primary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
          Live preview
        </span>

        <div className="relative space-y-2">
          <h2 className="text-2xl font-bold text-[var(--color-foreground)]">
            Crafting digital experiences.
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            This mock updates as you change colors, fonts, and effects — the
            real public site uses the same tokens.
          </p>
        </div>

        <div className="relative flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary text-sm">
            Contact Me
          </button>
          <span className="glass rounded-full border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-muted-foreground)]">
            Secondary
          </span>
        </div>

        <div className="glass relative space-y-2 rounded-2xl p-5">
          <h3 className="font-semibold text-[var(--color-foreground)]">
            Sample card
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Card style, radius, and shadow all apply here.
          </p>
          <div className="glow-border rounded-xl border border-[var(--color-border)] p-3 text-xs text-[var(--color-muted-foreground)]">
            Glow/shadow sample
          </div>
        </div>
      </div>
    </div>
  );
}
