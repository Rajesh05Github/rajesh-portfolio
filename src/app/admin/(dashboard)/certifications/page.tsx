import Link from "next/link";
import {
  listCertifications,
  deleteCertification,
  moveCertification,
} from "@/features/certification/actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { OrderButtons } from "@/components/admin/order-buttons";
import { DeleteButton } from "@/components/admin/delete-button";

export default async function CertificationsListPage() {
  const items = await listCertifications();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Certifications</h1>
        <Link
          href="/admin/certifications/new"
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
              <th className="p-4">Name</th>
              <th className="p-4">Issuer</th>
              <th className="p-4">Status</th>
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
                      moveCertification.bind(null, direction, item.id)
                    }
                    disableUp={index === 0}
                    disableDown={index === items.length - 1}
                  />
                </td>
                <td className="p-4 font-medium">{item.name}</td>
                <td className="text-muted-foreground p-4">{item.issuer}</td>
                <td className="p-4">
                  <StatusBadge status={item.status} />
                </td>
                <td className="space-x-4 p-4 text-right">
                  <Link
                    href={`/admin/certifications/${item.id}/edit`}
                    className="text-primary hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteButton
                    action={deleteCertification.bind(null, item.id)}
                  />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-muted-foreground p-6 text-center"
                >
                  No certifications yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
