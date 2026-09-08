import type { PortfolioSection } from "@/lib/db/schema";
import {
  getAbout,
  getPublishedAchievements,
  getPublishedCertifications,
  getPublishedEducation,
  getPublishedExperience,
  getPublishedProjects,
  getPublishedSkills,
  getProfile,
  getVisibleSections,
  getVisibleSocialLinks,
} from "@/features/portfolio/queries";
import { getActiveResumeMeta } from "@/features/resume/queries";
import { HeroSection } from "@/components/portfolio/hero";
import { AboutSection } from "@/components/portfolio/about";
import { ExperienceSection } from "@/components/portfolio/experience";
import { EducationSection } from "@/components/portfolio/education";
import { SkillsSection } from "@/components/portfolio/skills";
import { ProjectsSection } from "@/components/portfolio/projects";
import { CertificationsSection } from "@/components/portfolio/certifications";
import { AchievementsSection } from "@/components/portfolio/achievements";
import { ContactSection } from "@/components/portfolio/contact";

// Sections render from PortfolioSection (visibility + order) — never a
// hardcoded JSX list (docs/database-design.md §3, the reference repo's
// App.jsx hardcoded this; docs/existing-system-audit.md flagged replacing it).
export default async function HomePage() {
  const [
    profile,
    about,
    sections,
    experience,
    education,
    skills,
    projects,
    certifications,
    achievements,
    socialLinks,
    resumeMeta,
  ] = await Promise.all([
    getProfile(),
    getAbout(),
    getVisibleSections(),
    getPublishedExperience(),
    getPublishedEducation(),
    getPublishedSkills(),
    getPublishedProjects(),
    getPublishedCertifications(),
    getPublishedAchievements(),
    getVisibleSocialLinks(),
    getActiveResumeMeta(),
  ]);

  if (!profile) {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">No profile configured yet</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Set up the site owner&apos;s profile via{" "}
          <code className="bg-surface rounded px-1.5 py-0.5">
            /admin/profile
          </code>
          .
        </p>
      </section>
    );
  }

  const renderSection = (key: PortfolioSection["key"]) => {
    switch (key) {
      case "HERO":
        return (
          <HeroSection
            key={key}
            profile={profile}
            hasResume={resumeMeta !== null}
          />
        );
      case "ABOUT":
        return about ? <AboutSection key={key} about={about} /> : null;
      case "EXPERIENCE":
        return <ExperienceSection key={key} items={experience} />;
      case "EDUCATION":
        return <EducationSection key={key} items={education} />;
      case "SKILLS":
        return <SkillsSection key={key} items={skills} />;
      case "PROJECTS":
        return <ProjectsSection key={key} items={projects} />;
      case "CERTIFICATIONS":
        return <CertificationsSection key={key} items={certifications} />;
      case "ACHIEVEMENTS":
        return <AchievementsSection key={key} items={achievements} />;
      case "CONTACT":
        return <ContactSection key={key} socialLinks={socialLinks} />;
      case "SERVICES":
        // No Service content entity yet (docs/database-design.md §9 — not
        // modeled this phase); the section toggle exists for future use.
        return null;
      default:
        return null;
    }
  };

  return <>{sections.map((section) => renderSection(section.key))}</>;
}
