import { notFound } from "next/navigation";
import {
  getSocialLinkById,
  updateSocialLink,
} from "@/features/social-link/actions";
import { SocialLinkForm } from "@/components/admin/social-link-form";

export default async function EditSocialLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const socialLink = await getSocialLinkById(id);
  if (!socialLink) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit social link</h1>
      <SocialLinkForm
        socialLink={socialLink}
        action={updateSocialLink.bind(null, id)}
      />
    </div>
  );
}
