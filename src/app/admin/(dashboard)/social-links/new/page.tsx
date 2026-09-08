import { createSocialLink } from "@/features/social-link/actions";
import { SocialLinkForm } from "@/components/admin/social-link-form";

export default function NewSocialLinkPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New social link</h1>
      <SocialLinkForm action={createSocialLink} />
    </div>
  );
}
