import type { Education } from "@/lib/db/schema";
import {
  TextField,
  TextAreaField,
  SelectField,
} from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";

function toDateInputValue(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function EducationForm({
  education,
  action,
}: {
  education?: Education;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
      <TextField
        name="institution"
        label="Institution"
        defaultValue={education?.institution}
        required
      />
      <TextField
        name="degree"
        label="Degree"
        defaultValue={education?.degree}
        required
      />
      <TextField
        name="field"
        label="Field of study"
        defaultValue={education?.field ?? undefined}
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="startDate"
          label="Start date"
          type="date"
          defaultValue={toDateInputValue(education?.startDate)}
          required
        />
        <TextField
          name="endDate"
          label="End date (blank = current)"
          type="date"
          defaultValue={toDateInputValue(education?.endDate)}
        />
      </div>
      <TextAreaField
        name="description"
        label="Description"
        defaultValue={education?.description ?? undefined}
        rows={5}
      />
      <SelectField
        name="status"
        label="Status"
        defaultValue={education?.status ?? "DRAFT"}
        options={[
          { value: "DRAFT", label: "Draft" },
          { value: "PUBLISHED", label: "Published" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
      />
      <SubmitButton>{education ? "Save changes" : "Create"}</SubmitButton>
    </form>
  );
}
