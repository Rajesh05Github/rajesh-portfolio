import { notFound } from "next/navigation";
import {
  getCertificationById,
  updateCertification,
} from "@/features/certification/actions";
import { getOrCreateKnowledgeDocument } from "@/features/knowledge/actions";
import { CertificationForm } from "@/components/admin/certification-form";
import { AiKnowledgeSection } from "@/components/admin/ai-knowledge-section";

export default async function EditCertificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const certification = await getCertificationById(id);
  if (!certification) notFound();

  const knowledgeDocument = await getOrCreateKnowledgeDocument(
    "CERTIFICATION",
    id,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit certification</h1>
      <CertificationForm
        certification={certification}
        action={updateCertification.bind(null, id)}
      />
      <AiKnowledgeSection
        document={knowledgeDocument}
        redirectPath={`/admin/certifications/${id}/edit`}
      />
    </div>
  );
}
