import { redirect } from "next/navigation";
import { getSessionTokenFromCookies } from "@/lib/auth/cookies";
import { validateSessionToken } from "@/lib/auth/session";
import { LoginForm } from "@/components/admin/login-form";

export default async function AdminLoginPage() {
  const token = await getSessionTokenFromCookies();
  const { user } = token ? await validateSessionToken(token) : { user: null };
  if (user) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <LoginForm />
    </div>
  );
}
