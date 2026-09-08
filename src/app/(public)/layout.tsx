import type { Metadata } from "next";
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

// Overrides the root layout's generic "Portfolio" fallback (docs: that
// title was a Phase 5 placeholder never revisited) with the real owner's
// name, once there's a real Profile row to read it from. `template` shapes
// how a page-specific title (e.g. a future `/projects/[slug]`) combines
// with this — "Some Project | Rajesh's Portfolio", not just the page name
// alone.
export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const name = profile?.name?.trim();
  if (!name) return {};
  return {
    // `absolute` (not `default`) is what actually breaks out of the root
    // layout's own template ("%s | Portfolio") — with `default` alone, Next
    // still wraps this in that ancestor template, producing the wrong
    // "Rajesh's Portfolio | Portfolio" double-up (verified live).
    title: {
      absolute: `${name}'s Portfolio`,
      template: `%s | ${name}'s Portfolio`,
    },
  };
}

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
