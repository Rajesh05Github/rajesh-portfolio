import { notFound } from "next/navigation";
import {
  getExperienceById,
  updateExperience,
} from "@/features/experience/actions";
import { getOrCreateKnowledgeDocument } from "@/features/knowledge/actions";
import { ExperienceForm } from "@/components/admin/experience-form";
import { AiKnowledgeSection } from "@/components/admin/ai-knowledge-section";

export default async function EditExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const experience = await getExperienceById(id);
  if (!experience) notFound();

  const knowledgeDocument = await getOrCreateKnowledgeDocument(
    "EXPERIENCE",
    id,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit experience entry</h1>
      <ExperienceForm
        experience={experience}
        action={updateExperience.bind(null, id)}
      />
      <AiKnowledgeSection
        document={knowledgeDocument}
        redirectPath={`/admin/experience/${id}/edit`}
      />
    </div>
  );
}
