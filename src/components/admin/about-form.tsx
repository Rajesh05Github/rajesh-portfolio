import type { About } from "@/lib/db/schema";
import { TextAreaField } from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";

function highlightsToText(about?: About | null): string | undefined {
  if (!about) return undefined;
  return about.highlights
    .map((h) => `${h.icon}|${h.title}|${h.description}`)
    .join("\n");
}

export function AboutForm({
  about,
  action,
}: {
  about?: About | null;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
      <TextAreaField
        name="bio"
        label="Bio"
        defaultValue={about?.bio}
        required
        rows={6}
      />
      <TextAreaField
        name="missionQuote"
        label="Mission quote"
        defaultValue={about?.missionQuote ?? undefined}
        rows={3}
      />
      <TextAreaField
        name="highlightsText"
        label="Highlights (one per line, format: icon|title|description)"
        defaultValue={highlightsToText(about)}
        rows={6}
      />
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
