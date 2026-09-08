import type { Certification } from "@/lib/db/schema";
import { TextField, SelectField } from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";

function toDateInputValue(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function CertificationForm({
  certification,
  action,
}: {
  certification?: Certification;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
      <TextField
        name="name"
        label="Name"
        defaultValue={certification?.name}
        required
      />
      <TextField
        name="issuer"
        label="Issuer"
        defaultValue={certification?.issuer}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="issueDate"
          label="Issue date"
          type="date"
          defaultValue={toDateInputValue(certification?.issueDate)}
          required
        />
        <TextField
          name="expiryDate"
          label="Expiry date (blank = no expiry)"
          type="date"
          defaultValue={toDateInputValue(certification?.expiryDate)}
        />
      </div>
      <TextField
        name="credentialUrl"
        label="Credential URL"
        type="url"
        defaultValue={certification?.credentialUrl ?? ""}
        placeholder="https://www.credly.com/badges/..."
      />
      <SelectField
        name="status"
        label="Status"
        defaultValue={certification?.status ?? "DRAFT"}
        options={[
          { value: "DRAFT", label: "Draft" },
          { value: "PUBLISHED", label: "Published" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
      />
      <SubmitButton>{certification ? "Save changes" : "Create"}</SubmitButton>
    </form>
  );
}
