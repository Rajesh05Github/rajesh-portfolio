import { createCertification } from "@/features/certification/actions";
import { CertificationForm } from "@/components/admin/certification-form";

export default function NewCertificationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New certification</h1>
      <CertificationForm action={createCertification} />
    </div>
  );
}
