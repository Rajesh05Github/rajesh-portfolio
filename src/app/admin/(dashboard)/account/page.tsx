import { requireAdminUser } from "@/lib/auth/require-admin";
import { ChangePasswordForm } from "@/components/admin/change-password-form";

export default async function AccountPage() {
  const user = await requireAdminUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Signed in as {user.email} ({user.role}).
        </p>
      </div>

      <div className="glass max-w-md rounded-2xl p-6">
        <h2 className="mb-4 font-semibold">Change password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
