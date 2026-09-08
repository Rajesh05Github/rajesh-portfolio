import { notFound } from "next/navigation";
import { getSkillById, updateSkill } from "@/features/skill/actions";
import { getOrCreateKnowledgeDocument } from "@/features/knowledge/actions";
import { SkillForm } from "@/components/admin/skill-form";
import { AiKnowledgeSection } from "@/components/admin/ai-knowledge-section";

export default async function EditSkillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const skill = await getSkillById(id);
  if (!skill) notFound();

  const knowledgeDocument = await getOrCreateKnowledgeDocument("SKILL", id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit skill</h1>
      <SkillForm skill={skill} action={updateSkill.bind(null, id)} />
      <AiKnowledgeSection
        document={knowledgeDocument}
        redirectPath={`/admin/skills/${id}/edit`}
      />
    </div>
  );
}
