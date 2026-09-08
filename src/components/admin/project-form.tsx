import type { Project, ProjectTechnology } from "@/lib/db/schema";
import {
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
} from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";

export function ProjectForm({
  project,
  action,
}: {
  project?: Project & { technologies: ProjectTechnology[] };
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
      <TextField
        name="title"
        label="Title"
        defaultValue={project?.title}
        required
      />
      <TextField
        name="slug"
        label="Slug"
        defaultValue={project?.slug}
        placeholder="my-example-project"
        required
      />
      <TextAreaField
        name="description"
        label="Short description"
        defaultValue={project?.description}
        required
        rows={3}
      />
      <TextAreaField
        name="longDescription"
        label="Long description (optional)"
        defaultValue={project?.longDescription ?? undefined}
        rows={6}
      />
      <TextField
        name="coverImageUrl"
        label="Cover image URL"
        defaultValue={project?.coverImageUrl ?? undefined}
        type="url"
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="liveUrl"
          label="Live URL"
          defaultValue={project?.liveUrl ?? undefined}
          type="url"
        />
        <TextField
          name="githubUrl"
          label="GitHub URL"
          defaultValue={project?.githubUrl ?? undefined}
          type="url"
        />
      </div>
      <TextField
        name="technologies"
        label="Technologies (comma-separated)"
        defaultValue={project?.technologies.map((t) => t.technology).join(", ")}
        placeholder="Next.js, PostgreSQL, Redis"
      />
      <CheckboxField
        name="featured"
        label="Featured"
        defaultChecked={project?.featured}
      />
      <SelectField
        name="status"
        label="Status"
        defaultValue={project?.status ?? "DRAFT"}
        options={[
          { value: "DRAFT", label: "Draft" },
          { value: "PUBLISHED", label: "Published" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
      />
      <SubmitButton>{project ? "Save changes" : "Create"}</SubmitButton>
    </form>
  );
}
