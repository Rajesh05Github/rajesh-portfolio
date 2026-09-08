import { notFound } from "next/navigation";
import {
  getEducationById,
  updateEducation,
} from "@/features/education/actions";
import { getOrCreateKnowledgeDocument } from "@/features/knowledge/actions";
import { EducationForm } from "@/components/admin/education-form";
import { AiKnowledgeSection } from "@/components/admin/ai-knowledge-section";

export default async function EditEducationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const education = await getEducationById(id);
  if (!education) notFound();

  const knowledgeDocument = await getOrCreateKnowledgeDocument("EDUCATION", id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit education entry</h1>
      <EducationForm
        education={education}
        action={updateEducation.bind(null, id)}
      />
      <AiKnowledgeSection
        document={knowledgeDocument}
        redirectPath={`/admin/education/${id}/edit`}
      />
    </div>
  );
}
