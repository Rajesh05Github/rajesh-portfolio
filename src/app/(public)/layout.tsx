import { Navbar } from "@/components/portfolio/navbar";
import { Footer } from "@/components/portfolio/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import {
  getProfile,
  getVisibleSections,
  getVisibleSocialLinks,
} from "@/features/portfolio/queries";
import { getActiveThemeConfig } from "@/features/theme/queries";
import { computeThemeDataAttributes } from "@/lib/theme/apply";
import { ThemeModeProvider } from "@/components/theme/theme-mode-provider";

// This reads live, admin-editable content directly from Postgres on every
// request — it must never be statically prerendered at build time (which
// would both require the database to be reachable during `next build` and
// bake in stale content). Forcing dynamic rendering here covers every page
// in the (public) route group.
export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, sections, socialLinks, themeConfig] = await Promise.all([
    getProfile(),
    getVisibleSections(),
    getVisibleSocialLinks(),
    getActiveThemeConfig(),
  ]);

  const profileName = profile?.name ?? "Portfolio";
  const brandLabel = profile?.brandLabel || undefined;

  // Theme overrides apply only within this wrapper — the admin panel (a
  // sibling route group under the same root layout) never carries these
  // variables/attributes, so it keeps its fixed appearance regardless of
  // what the site owner picks (docs/architecture.md, master prompt §104).
  return (
    <ThemeModeProvider
      themeConfig={themeConfig}
      dataAttributes={computeThemeDataAttributes(themeConfig)}
    >
      <Navbar
        profileName={profileName}
        brandLabel={brandLabel}
        sections={sections}
      />
      <main>{children}</main>
      <Footer
        profileName={profileName}
        sections={sections}
        socialLinks={socialLinks}
      />
      <ChatWidget />
    </ThemeModeProvider>
  );
}
