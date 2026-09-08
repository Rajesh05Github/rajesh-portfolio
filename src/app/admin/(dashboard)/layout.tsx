import { redirect } from "next/navigation";
import { getSessionTokenFromCookies } from "@/lib/auth/cookies";
import { validateSessionToken } from "@/lib/auth/session";
import { SidebarNav } from "@/components/admin/sidebar-nav";
import { getNewContactMessageCount } from "@/features/contact/queries";

// Every route under this group requires a valid session — checked here,
// server-side, on every request (not just hidden behind a nav link). Login
// itself lives outside this route group so it isn't caught by this guard
// (docs/security.md §2).
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getSessionTokenFromCookies();
  const { user } = token ? await validateSessionToken(token) : { user: null };

  if (!user) {
    redirect("/admin/login");
  }

  const newContactCount = await getNewContactMessageCount();

  return (
    // `h-screen` + `overflow-hidden` here (not `min-h-screen`) is what makes
    // this the one true app shell instead of a normal scrolling document —
    // it never grows past the viewport itself, so the browser/document never
    // gets its own scrollbar. Every scrollable region below is explicit
    // (`overflow-y-auto` on the sidebar and on `<main>`), so a page never
    // ends up with two competing scrollbars (the document's and a box's own).
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
      <header className="glass-strong flex shrink-0 items-center justify-between px-6 py-4">
        <span className="font-semibold">Admin</span>
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          <span>{user.email}</span>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="text-primary hover:underline">
              Log out
            </button>
          </form>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <SidebarNav newContactCount={newContactCount} />
        {/* min-w-0 overrides a flex item's default min-width:auto — without it, a
            wide child (like a data table) forces this whole column to grow instead
            of scrolling internally, and the page body ends up scrolling horizontally.
            overflow-y-auto here is the fallback scroll region for any admin page
            that doesn't manage its own internal scrolling (most of them, e.g. a
            long form) — a page that wants tighter control (like the conversation
            transcript) fills this exactly via `h-full` and scrolls its own inner
            box instead, so this outer one never needs to. */}
        <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
