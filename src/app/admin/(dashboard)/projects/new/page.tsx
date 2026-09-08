import { createProject } from "@/features/project/actions";
import { ProjectForm } from "@/components/admin/project-form";

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New project</h1>
      <ProjectForm action={createProject} />
    </div>
  );
}
