"use client";

import { useState, useTransition } from "react";
import type { ThemeConfig } from "@/lib/theme/config";
import {
  updateActiveThemeConfig,
  resetActiveThemeToPreset,
} from "@/features/theme/actions";
import { HEADING_FONT_OPTIONS, BODY_FONT_OPTIONS } from "@/lib/theme/fonts";
import { ThemePreviewPanel } from "@/components/admin/theme-preview-panel";

const COLOR_LABELS: Record<keyof ThemeConfig["colors"], string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  background: "Background",
  surface: "Surface",
  text: "Text",
  mutedText: "Muted text",
  border: "Border",
  success: "Success",
  warning: "Warning",
  error: "Error",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-muted-foreground font-medium">{label}</span>
      {children}
    </label>
  );
}

const SELECT_CLASS =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

export function ThemeCustomizeForm({
  initialConfig,
  hasBasePreset,
}: {
  initialConfig: ThemeConfig;
  hasBasePreset: boolean;
}) {
  const [config, setConfig] = useState<ThemeConfig>(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function setSection<S extends keyof ThemeConfig>(
    section: S,
    patch: Partial<ThemeConfig[S]>,
  ) {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...patch },
    }));
    setStatus(null);
  }

  function handleSave() {
    startTransition(async () => {
      await updateActiveThemeConfig(config);
      setStatus("Saved.");
    });
  }

  function handleReset() {
    startTransition(async () => {
      const restored = await resetActiveThemeToPreset();
      if (restored) {
        setConfig(restored);
        setStatus("Reset to preset.");
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-8">
        <section className="glass space-y-4 rounded-2xl p-6">
          <h2 className="font-semibold">Colors</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(
              Object.keys(config.colors) as (keyof ThemeConfig["colors"])[]
            ).map((key) => (
              <Field key={key} label={COLOR_LABELS[key]}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.colors[key]}
                    onChange={(e) =>
                      setSection("colors", { [key]: e.target.value } as Partial<
                        ThemeConfig["colors"]
                      >)
                    }
                    className="border-border h-9 w-9 cursor-pointer rounded-lg border bg-transparent p-0.5"
                  />
                  <span className="text-muted-foreground text-xs">
                    {config.colors[key]}
                  </span>
                </div>
              </Field>
            ))}
          </div>
        </section>

        <section className="glass space-y-4 rounded-2xl p-6">
          <h2 className="font-semibold">Typography</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Heading font">
              <select
                className={SELECT_CLASS}
                value={config.typography.headingFont}
                onChange={(e) =>
                  setSection("typography", {
                    headingFont: e.target
                      .value as ThemeConfig["typography"]["headingFont"],
                  })
                }
              >
                {Object.entries(HEADING_FONT_OPTIONS).map(([value, opt]) => (
                  <option key={value} value={value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Body font">
              <select
                className={SELECT_CLASS}
                value={config.typography.bodyFont}
                onChange={(e) =>
                  setSection("typography", {
                    bodyFont: e.target
                      .value as ThemeConfig["typography"]["bodyFont"],
                  })
                }
              >
                {Object.entries(BODY_FONT_OPTIONS).map(([value, opt]) => (
                  <option key={value} value={value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Heading weight">
              <select
                className={SELECT_CLASS}
                value={config.typography.headingWeight}
                onChange={(e) =>
                  setSection("typography", {
                    headingWeight: Number(e.target.value),
                  })
                }
              >
                {[400, 500, 600, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Body weight">
              <select
                className={SELECT_CLASS}
                value={config.typography.bodyWeight}
                onChange={(e) =>
                  setSection("typography", {
                    bodyWeight: Number(e.target.value),
                  })
                }
              >
                {[300, 400, 500, 600].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="glass space-y-4 rounded-2xl p-6">
          <h2 className="font-semibold">Layout</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Max width">
              <input
                className={SELECT_CLASS}
                value={config.layout.maxWidth}
                onChange={(e) =>
                  setSection("layout", { maxWidth: e.target.value })
                }
              />
            </Field>
            <Field label="Section spacing">
              <input
                className={SELECT_CLASS}
                value={config.layout.sectionSpacing}
                onChange={(e) =>
                  setSection("layout", { sectionSpacing: e.target.value })
                }
              />
            </Field>
            <Field label="Container padding">
              <input
                className={SELECT_CLASS}
                value={config.layout.containerPadding}
                onChange={(e) =>
                  setSection("layout", { containerPadding: e.target.value })
                }
              />
            </Field>
          </div>
        </section>

        <section className="glass space-y-4 rounded-2xl p-6">
          <h2 className="font-semibold">Components</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Radius">
              <select
                className={SELECT_CLASS}
                value={config.components.radius}
                onChange={(e) =>
                  setSection("components", {
                    radius: e.target
                      .value as ThemeConfig["components"]["radius"],
                  })
                }
              >
                {["none", "small", "medium", "large"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Button style">
              <select
                className={SELECT_CLASS}
                value={config.components.buttonStyle}
                onChange={(e) =>
                  setSection("components", {
                    buttonStyle: e.target
                      .value as ThemeConfig["components"]["buttonStyle"],
                  })
                }
              >
                {["solid", "outline", "ghost"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Card style">
              <select
                className={SELECT_CLASS}
                value={config.components.cardStyle}
                onChange={(e) =>
                  setSection("components", {
                    cardStyle: e.target
                      .value as ThemeConfig["components"]["cardStyle"],
                  })
                }
              >
                {["glass", "solid", "bordered"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Shadow style">
              <select
                className={SELECT_CLASS}
                value={config.components.shadowStyle}
                onChange={(e) =>
                  setSection("components", {
                    shadowStyle: e.target
                      .value as ThemeConfig["components"]["shadowStyle"],
                  })
                }
              >
                {["none", "soft", "glow"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="glass space-y-4 rounded-2xl p-6">
          <h2 className="font-semibold">Effects</h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.effects.animations}
                onChange={(e) =>
                  setSection("effects", { animations: e.target.checked })
                }
                className="accent-primary h-4 w-4"
              />
              Animations
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.effects.gradients}
                onChange={(e) =>
                  setSection("effects", { gradients: e.target.checked })
                }
                className="accent-primary h-4 w-4"
              />
              Background gradients
            </label>
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save changes"}
          </button>
          {hasBasePreset && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Reset to preset
            </button>
          )}
          {status && (
            <span className="text-muted-foreground text-sm">{status}</span>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <ThemePreviewPanel config={config} />
      </div>
    </div>
  );
}
