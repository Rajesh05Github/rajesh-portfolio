import { notFound } from "next/navigation";
import {
  getAchievementById,
  updateAchievement,
} from "@/features/achievement/actions";
import { getOrCreateKnowledgeDocument } from "@/features/knowledge/actions";
import { AchievementForm } from "@/components/admin/achievement-form";
import { AiKnowledgeSection } from "@/components/admin/ai-knowledge-section";

export default async function EditAchievementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const achievement = await getAchievementById(id);
  if (!achievement) notFound();

  const knowledgeDocument = await getOrCreateKnowledgeDocument(
    "ACHIEVEMENT",
    id,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit achievement</h1>
      <AchievementForm
        achievement={achievement}
        action={updateAchievement.bind(null, id)}
      />
      <AiKnowledgeSection
        document={knowledgeDocument}
        redirectPath={`/admin/achievements/${id}/edit`}
      />
    </div>
  );
}
