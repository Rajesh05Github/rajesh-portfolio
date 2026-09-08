import Link from "next/link";
import {
  listThemePresets,
  listThemes,
  activatePreset,
  activateTheme,
  duplicateTheme,
  deleteTheme,
} from "@/features/theme/actions";
import { DeleteButton } from "@/components/admin/delete-button";

export default async function ThemesPage() {
  const [presets, themes] = await Promise.all([
    listThemePresets(),
    listThemes(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Themes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Activate a preset, or fine-tune the active theme in{" "}
            <Link
              href="/admin/appearance/customize"
              className="text-primary hover:underline"
            >
              Customize
            </Link>
            .
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Presets</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => {
            const activeTheme = themes.find(
              (t) => t.basePresetId === preset.id && t.isActive,
            );
            return (
              <div key={preset.id} className="glass space-y-3 rounded-2xl p-6">
                <div className="flex items-center gap-2">
                  {Object.values(preset.config.colors)
                    .slice(0, 5)
                    .map((color, idx) => (
                      <span
                        key={idx}
                        className="border-border h-6 w-6 rounded-full border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                </div>
                <div>
                  <h3 className="font-semibold">{preset.name}</h3>
                  {activeTheme && (
                    <p className="text-primary text-xs">Active</p>
                  )}
                </div>
                {!activeTheme && (
                  <form action={activatePreset.bind(null, preset.id)}>
                    <button
                      type="submit"
                      className="text-primary text-sm hover:underline"
                    >
                      Activate
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Custom themes</h2>
        <div className="glass overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-border border-b text-left">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {themes.map((item) => (
                <tr
                  key={item.id}
                  className="border-border border-b last:border-0"
                >
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4">
                    {item.isActive ? (
                      <span className="bg-primary/15 text-primary rounded-full px-3 py-1 text-xs font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="space-x-4 p-4 text-right">
                    {!item.isActive && (
                      <form
                        action={activateTheme.bind(null, item.id)}
                        className="inline"
                      >
                        <button
                          type="submit"
                          className="text-primary hover:underline"
                        >
                          Activate
                        </button>
                      </form>
                    )}
                    <form
                      action={duplicateTheme.bind(null, item.id)}
                      className="inline"
                    >
                      <button
                        type="submit"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Duplicate
                      </button>
                    </form>
                    {/* The active theme has no Delete — deleting it would
                        leave the public site with nothing applied at all;
                        activate a different theme first to free this one up. */}
                    {!item.isActive && (
                      <span className="inline-block">
                        <DeleteButton
                          action={deleteTheme.bind(null, item.id)}
                        />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {themes.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="text-muted-foreground p-6 text-center"
                  >
                    No themes yet — activate a preset above to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
