import type { PortfolioSection, SocialLink } from "@/lib/db/schema";
import {
  SECTION_LABELS,
  sectionAnchor,
} from "@/features/portfolio/section-labels";
import { SocialIcon } from "./social-icon";

export function Footer({
  profileName,
  sections,
  socialLinks,
}: {
  profileName: string;
  sections: PortfolioSection[];
  socialLinks: SocialLink[];
}) {
  const currentYear = new Date().getFullYear();
  const footerLinks = sections
    .filter((section) => section.key !== "HERO")
    .map((section) => ({
      href: `#${sectionAnchor(section.key)}`,
      label: SECTION_LABELS[section.key],
    }));

  return (
    <footer className="border-border border-t py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="text-center md:text-left">
            <a href="#" className="text-xl font-bold tracking-tight">
              {profileName}
            </a>
            <p className="text-muted-foreground mt-2 text-sm">
              © {currentYear} {profileName}. All rights reserved.
            </p>
          </div>

          <nav className="flex flex-wrap justify-center gap-6">
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.id}
                href={social.url}
                aria-label={social.label ?? social.platform}
                className="glass hover:bg-primary/10 hover:text-primary rounded-full p-2 transition-all"
              >
                <SocialIcon platform={social.platform} className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
