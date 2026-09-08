import {
  listSections,
  toggleSectionVisibility,
  moveSection,
} from "@/features/layout/actions";
import { SECTION_LABELS } from "@/features/portfolio/section-labels";
import { OrderButtons } from "@/components/admin/order-buttons";

export default async function SectionsPage() {
  const sections = await listSections();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sections</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Control which sections appear on the public site, and in what order.
        </p>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-border border-b text-left">
            <tr>
              <th className="w-16 p-4"></th>
              <th className="p-4">Section</th>
              <th className="p-4">Visible</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section, index) => (
              <tr
                key={section.id}
                className="border-border border-b last:border-0"
              >
                <td className="p-4">
                  <OrderButtons
                    moveAction={(direction) =>
                      moveSection.bind(null, direction, section.id)
                    }
                    disableUp={index === 0}
                    disableDown={index === sections.length - 1}
                  />
                </td>
                <td className="p-4 font-medium">
                  {SECTION_LABELS[section.key]}
                </td>
                <td className="p-4">
                  <form
                    action={toggleSectionVisibility.bind(
                      null,
                      section.id,
                      section.isVisible,
                    )}
                  >
                    <button
                      type="submit"
                      className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                        section.isVisible
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {section.isVisible ? "Visible" : "Hidden"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
