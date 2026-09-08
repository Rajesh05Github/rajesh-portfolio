import type { SocialLink } from "@/lib/db/schema";
import { TextField, SelectField } from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";

const PLATFORM_OPTIONS = [
  { value: "GITHUB", label: "GitHub" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TWITTER", label: "Twitter" },
  { value: "EMAIL", label: "Email" },
  { value: "WEBSITE", label: "Website" },
  { value: "OTHER", label: "Other" },
];

export function SocialLinkForm({
  socialLink,
  action,
}: {
  socialLink?: SocialLink;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
      <SelectField
        name="platform"
        label="Platform"
        defaultValue={socialLink?.platform ?? "GITHUB"}
        options={PLATFORM_OPTIONS}
        required
      />
      <TextField
        name="url"
        label="URL"
        defaultValue={socialLink?.url}
        placeholder="https://github.com/you or mailto:you@example.com"
        required
      />
      <TextField
        name="label"
        label="Label (optional)"
        defaultValue={socialLink?.label ?? ""}
      />
      <SubmitButton>{socialLink ? "Save changes" : "Create"}</SubmitButton>
    </form>
  );
}
