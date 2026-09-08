import type { Experience } from "@/lib/db/schema";
import {
  TextField,
  TextAreaField,
  SelectField,
} from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";

function toDateInputValue(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function ExperienceForm({
  experience,
  action,
}: {
  experience?: Experience;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
      <TextField
        name="role"
        label="Role"
        defaultValue={experience?.role}
        required
      />
      <TextField
        name="company"
        label="Company"
        defaultValue={experience?.company}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="startDate"
          label="Start date"
          type="date"
          defaultValue={toDateInputValue(experience?.startDate)}
          required
        />
        <TextField
          name="endDate"
          label="End date (blank = current)"
          type="date"
          defaultValue={toDateInputValue(experience?.endDate)}
        />
      </div>
      <TextAreaField
        name="description"
        label="Description"
        defaultValue={experience?.description}
        required
        rows={5}
      />
      <TextField
        name="technologies"
        label="Technologies (comma-separated)"
        defaultValue={experience?.technologies.join(", ")}
        placeholder="React, TypeScript, Next.js"
      />
      <SelectField
        name="status"
        label="Status"
        defaultValue={experience?.status ?? "DRAFT"}
        options={[
          { value: "DRAFT", label: "Draft" },
          { value: "PUBLISHED", label: "Published" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
      />
      <SubmitButton>{experience ? "Save changes" : "Create"}</SubmitButton>
    </form>
  );
}
