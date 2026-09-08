import type { Profile } from "@/lib/db/schema";
import { TextField, CheckboxField } from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";

export function ProfileForm({
  profile,
  action,
}: {
  profile?: Profile | null;
  action: (formData: FormData) => void;
}) {
  return (
    <div className="max-w-xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium">Photo</p>
        <div className="flex items-center gap-4">
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-preview thumbnail, same reasoning as Hero's rendering
            <img
              src={profile.avatarUrl}
              alt=""
              className="border-border h-16 w-16 rounded-full border object-cover"
            />
          ) : (
            <div className="bg-surface border-border text-muted-foreground flex h-16 w-16 items-center justify-center rounded-full border text-xs">
              None
            </div>
          )}
          <form
            action="/api/admin/avatar"
            method="post"
            encType="multipart/form-data"
            className="flex items-center gap-3"
          >
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="file:bg-primary file:text-primary-foreground text-sm file:mr-3 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
            />
            <button
              type="submit"
              className="border-border rounded-full border px-4 py-2 text-sm font-medium"
            >
              Upload
            </button>
          </form>
        </div>
        <p className="text-muted-foreground text-xs">
          JPEG, PNG, or WebP, up to 5MB. Shown in the Hero section.
        </p>
      </div>

      <form action={action} className="space-y-6">
        <TextField
          name="name"
          label="Name"
          defaultValue={profile?.name}
          required
        />
        <TextField
          name="brandLabel"
          label="Navbar brand (optional)"
          placeholder={`Defaults to "${(profile?.name ?? "P").trim().charAt(0).toUpperCase()}"`}
          defaultValue={profile?.brandLabel ?? undefined}
        />
        <TextField
          name="headline"
          label="Headline"
          defaultValue={profile?.headline}
          required
        />
        <TextField
          name="tagline"
          label="Tagline"
          defaultValue={profile?.tagline ?? undefined}
        />
        <TextField
          name="avatarUrl"
          label="Avatar URL (or use the uploader above)"
          type="text"
          defaultValue={profile?.avatarUrl ?? undefined}
        />
        <TextField
          name="location"
          label="Location"
          defaultValue={profile?.location ?? undefined}
        />
        <CheckboxField
          name="availableForWork"
          label="Available for work"
          defaultChecked={profile?.availableForWork}
        />
        <SubmitButton>Save changes</SubmitButton>
      </form>
    </div>
  );
}
