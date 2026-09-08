"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ThemeConfig } from "@/lib/theme/config";
import {
  computeThemeStyle,
  computeLightThemeStyle,
  type ThemeDataAttributes,
} from "@/lib/theme/apply";

type ColorMode = "dark" | "light";

const STORAGE_KEY = "color-mode";

const ThemeModeContext = createContext<{
  mode: ColorMode;
  toggleMode: () => void;
} | null>(null);

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }
  return ctx;
}

export function ThemeModeProvider({
  themeConfig,
  dataAttributes,
  children,
}: {
  themeConfig: ThemeConfig;
  dataAttributes: ThemeDataAttributes;
  children: ReactNode;
}) {
  // Server always renders "dark" (today's only mode, matching every existing
  // preset). The brief flash this can cause on first load — only when a
  // visitor's stored/system preference is "light" — is a deliberate,
  // documented trade-off rather than a full no-flash SSR solution (which
  // would need a cookie + blocking pre-hydration script); acceptable for a
  // personal portfolio site.
  const [mode, setMode] = useState<ColorMode>("dark");

  // Reads two external systems (localStorage, matchMedia) that don't exist
  // during SSR — this is a one-time sync from those systems into React
  // state on mount, not state derived from props, so the setState-in-effect
  // rule doesn't apply here the way it would for computed/derived state.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage (an external system), not deriving from props/state
      setMode(stored);
      return;
    }
    const prefersLight = window.matchMedia(
      "(prefers-color-scheme: light)",
    ).matches;
    if (prefersLight) setMode("light");
  }, []);

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  const style =
    mode === "light"
      ? computeLightThemeStyle(themeConfig)
      : computeThemeStyle(themeConfig);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <div
        // `body`'s own background reads `--color-background` from :root
        // (Tailwind's @theme scope), not from this div — a child can't push
        // a CSS variable up to an ancestor. `bg-background` here makes this
        // div paint its own background using the *local* (possibly
        // overridden) value, visually covering body's default everywhere
        // this div extends, which — via min-h-screen plus real content
        // height — is the whole scrollable page.
        className="bg-background text-foreground min-h-screen overflow-x-hidden"
        style={style}
        data-color-mode={mode}
        {...dataAttributes}
      >
        {children}
      </div>
    </ThemeModeContext.Provider>
  );
}
