import { getActiveTheme } from "@/features/theme/actions";
import { ThemeCustomizeForm } from "@/components/admin/theme-customize-form";

export default async function CustomizeThemePage() {
  const activeTheme = await getActiveTheme();

  if (!activeTheme) {
    return (
      <div className="glass max-w-lg rounded-2xl p-8">
        <h1 className="text-2xl font-semibold">No active theme</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Activate a preset from the Themes page first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Customize: {activeTheme.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Changes apply to the active theme and preview live below.
        </p>
      </div>
      <ThemeCustomizeForm
        initialConfig={activeTheme.config}
        hasBasePreset={activeTheme.basePresetId !== null}
      />
    </div>
  );
}
