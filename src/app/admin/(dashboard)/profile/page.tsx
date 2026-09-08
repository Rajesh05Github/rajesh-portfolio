import { getProfileForAdmin, updateProfile } from "@/features/profile/actions";
import { ProfileForm } from "@/components/admin/profile-form";

export default async function ProfilePage() {
  const profile = await getProfileForAdmin();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <ProfileForm profile={profile} action={updateProfile} />
    </div>
  );
}
