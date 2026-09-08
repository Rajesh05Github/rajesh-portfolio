import type { Achievement } from "@/lib/db/schema";
import {
  TextField,
  TextAreaField,
  SelectField,
} from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";

function toDateInputValue(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function AchievementForm({
  achievement,
  action,
}: {
  achievement?: Achievement;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
      <TextField
        name="title"
        label="Title"
        defaultValue={achievement?.title}
        required
      />
      <TextField
        name="date"
        label="Date"
        type="date"
        defaultValue={toDateInputValue(achievement?.date)}
        required
      />
      <TextAreaField
        name="description"
        label="Description"
        defaultValue={achievement?.description ?? ""}
        rows={5}
      />
      <SelectField
        name="status"
        label="Status"
        defaultValue={achievement?.status ?? "DRAFT"}
        options={[
          { value: "DRAFT", label: "Draft" },
          { value: "PUBLISHED", label: "Published" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
      />
      <SubmitButton>{achievement ? "Save changes" : "Create"}</SubmitButton>
    </form>
  );
}
