import { notFound } from "next/navigation";
import { getProjectById, updateProject } from "@/features/project/actions";
import { getOrCreateKnowledgeDocument } from "@/features/knowledge/actions";
import { ProjectForm } from "@/components/admin/project-form";
import { AiKnowledgeSection } from "@/components/admin/ai-knowledge-section";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const knowledgeDocument = await getOrCreateKnowledgeDocument("PROJECT", id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit project</h1>
      <ProjectForm project={project} action={updateProject.bind(null, id)} />
      <AiKnowledgeSection
        document={knowledgeDocument}
        redirectPath={`/admin/projects/${id}/edit`}
      />
    </div>
  );
}
