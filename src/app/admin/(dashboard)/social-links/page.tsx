import Link from "next/link";
import {
  listSocialLinks,
  deleteSocialLink,
  moveSocialLink,
  toggleSocialLinkVisibility,
} from "@/features/social-link/actions";
import { OrderButtons } from "@/components/admin/order-buttons";
import { DeleteButton } from "@/components/admin/delete-button";

export default async function SocialLinksListPage() {
  const items = await listSocialLinks();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Social links</h1>
        <Link
          href="/admin/social-links/new"
          className="bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-medium"
        >
          New
        </Link>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-border border-b text-left">
            <tr>
              <th className="w-16 p-4"></th>
              <th className="p-4">Platform</th>
              <th className="p-4">URL</th>
              <th className="p-4">Visible</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.id}
                className="border-border border-b last:border-0"
              >
                <td className="p-4">
                  <OrderButtons
                    moveAction={(direction) =>
                      moveSocialLink.bind(null, direction, item.id)
                    }
                    disableUp={index === 0}
                    disableDown={index === items.length - 1}
                  />
                </td>
                <td className="p-4 font-medium">
                  {item.label
                    ? `${item.platform} (${item.label})`
                    : item.platform}
                </td>
                <td className="text-muted-foreground max-w-xs truncate p-4">
                  {item.url}
                </td>
                <td className="p-4">
                  <form
                    action={toggleSocialLinkVisibility.bind(
                      null,
                      item.id,
                      item.isVisible,
                    )}
                  >
                    <button
                      type="submit"
                      className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                        item.isVisible
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.isVisible ? "Visible" : "Hidden"}
                    </button>
                  </form>
                </td>
                <td className="space-x-4 p-4 text-right">
                  <Link
                    href={`/admin/social-links/${item.id}/edit`}
                    className="text-primary hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteButton action={deleteSocialLink.bind(null, item.id)} />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-muted-foreground p-6 text-center"
                >
                  No social links yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
