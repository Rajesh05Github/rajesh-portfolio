import type { PortfolioSection } from "@/lib/db/schema";

/** Nav label + anchor id for each section key — single source, shared by Navbar and each section component's `id`. */
export const SECTION_LABELS: Record<PortfolioSection["key"], string> = {
  HERO: "Home",
  ABOUT: "About",
  EXPERIENCE: "Experience",
  EDUCATION: "Education",
  SKILLS: "Skills",
  PROJECTS: "Projects",
  CERTIFICATIONS: "Certifications",
  ACHIEVEMENTS: "Achievements",
  SERVICES: "Services",
  CONTACT: "Contact",
};

export function sectionAnchor(key: PortfolioSection["key"]): string {
  return key.toLowerCase();
}
