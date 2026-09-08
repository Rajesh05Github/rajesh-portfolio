import type { Skill } from "@/lib/db/schema";
import { TextField, SelectField } from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";

const CATEGORY_OPTIONS = [
  { value: "LANGUAGE", label: "Language" },
  { value: "FRAMEWORK", label: "Framework" },
  { value: "DATABASE", label: "Database" },
  { value: "TOOL", label: "Tool" },
  { value: "PLATFORM", label: "Platform" },
  { value: "SOFT_SKILL", label: "Soft skill" },
];

export function SkillForm({
  skill,
  action,
}: {
  skill?: Skill;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
      <TextField name="name" label="Name" defaultValue={skill?.name} required />
      <SelectField
        name="category"
        label="Category"
        defaultValue={skill?.category ?? "LANGUAGE"}
        options={CATEGORY_OPTIONS}
      />
      <TextField
        name="proficiency"
        label="Proficiency"
        type="number"
        defaultValue={skill?.proficiency ?? undefined}
        placeholder="1-5"
      />
      <SelectField
        name="status"
        label="Status"
        defaultValue={skill?.status ?? "DRAFT"}
        options={[
          { value: "DRAFT", label: "Draft" },
          { value: "PUBLISHED", label: "Published" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
      />
      <SubmitButton>{skill ? "Save changes" : "Create"}</SubmitButton>
    </form>
  );
}
