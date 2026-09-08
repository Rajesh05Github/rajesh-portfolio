/**
 * Seeds the database with clearly-marked SAMPLE data — not the site owner's
 * real career history (docs/existing-system-audit.md §6, master prompt §102).
 * Every string that would read as "real" content is prefixed/tagged so it's
 * obvious in the admin UI that it needs replacing before going live.
 *
 * Run: npm run db:seed
 */
import "dotenv/config";
import { db } from "./client";
import {
  about,
  achievement,
  certification,
  education,
  experience,
  knowledgeDocument,
  portfolioSection,
  profile,
  project,
  projectTechnology,
  skill,
  socialLink,
  theme,
  themePreset,
  type NewKnowledgeDocument,
} from "./schema";
import {
  DEFAULT_THEME_CONFIG,
  EMERALD_THEME_CONFIG,
  MINIMAL_THEME_CONFIG,
} from "../theme/config";

// Sample content is seeded as PUBLISHED (not DRAFT) so the freshly-seeded
// public site actually shows something instead of looking empty — the
// [SAMPLE] prefixes are what signal "replace me," not the DRAFT status.
async function seed() {
  console.log("Clearing existing content (dev-only, idempotent reseed)...");
  // Order matters: children before parents (FK constraints).
  await db.delete(knowledgeDocument);
  await db.delete(theme);
  await db.delete(themePreset);
  await db.delete(projectTechnology);
  await db.delete(project);
  await db.delete(achievement);
  await db.delete(certification);
  await db.delete(skill);
  await db.delete(education);
  await db.delete(experience);
  await db.delete(socialLink);
  await db.delete(portfolioSection);
  await db.delete(about);
  await db.delete(profile);

  console.log("Seeding sample data...");

  await db.insert(profile).values({
    name: "[SAMPLE] Jordan Rivera",
    headline: "[SAMPLE] Full-Stack Engineer & AI Systems Builder",
    tagline: "[SAMPLE] Replace via /admin/profile before publishing.",
    availableForWork: true,
  });

  const [sampleAbout] = await db
    .insert(about)
    .values({
      bio: "[SAMPLE] This is placeholder biography text. Replace it with your real background via /admin/about.",
      missionQuote: "[SAMPLE] Placeholder mission statement.",
      highlights: [
        {
          icon: "code",
          title: "[SAMPLE] Clean Code",
          description: "[SAMPLE] Placeholder highlight.",
        },
        {
          icon: "rocket",
          title: "[SAMPLE] Performance",
          description: "[SAMPLE] Placeholder highlight.",
        },
        {
          icon: "users",
          title: "[SAMPLE] Collaboration",
          description: "[SAMPLE] Placeholder highlight.",
        },
        {
          icon: "lightbulb",
          title: "[SAMPLE] Innovation",
          description: "[SAMPLE] Placeholder highlight.",
        },
      ],
    })
    .returning();

  const sampleExperience = await db
    .insert(experience)
    .values([
      {
        role: "[SAMPLE] Senior Software Engineer",
        company: "[SAMPLE] Example Corp",
        startDate: new Date("2022-01-01"),
        endDate: null,
        description:
          "[SAMPLE] Placeholder role description — replace via /admin/experience.",
        technologies: ["React", "TypeScript", "Next.js"],
        displayOrder: 0,
        status: "PUBLISHED",
      },
      {
        role: "[SAMPLE] Software Engineer",
        company: "[SAMPLE] Prior Company",
        startDate: new Date("2020-01-01"),
        endDate: new Date("2021-12-31"),
        description: "[SAMPLE] Placeholder role description.",
        technologies: ["JavaScript", "Node.js"],
        displayOrder: 1,
        status: "PUBLISHED",
      },
    ])
    .returning();

  const [sampleEducation] = await db
    .insert(education)
    .values({
      institution: "[SAMPLE] Example University",
      degree: "[SAMPLE] B.Sc. Computer Science",
      field: "Computer Science",
      startDate: new Date("2016-09-01"),
      endDate: new Date("2020-06-01"),
      description: "[SAMPLE] Placeholder — replace via /admin/education.",
      displayOrder: 0,
      status: "PUBLISHED",
    })
    .returning();

  const sampleSkills = await db
    .insert(skill)
    .values([
      {
        name: "TypeScript",
        category: "LANGUAGE",
        proficiency: 4,
        displayOrder: 0,
        status: "PUBLISHED",
      },
      {
        name: "React",
        category: "FRAMEWORK",
        proficiency: 4,
        displayOrder: 1,
        status: "PUBLISHED",
      },
      {
        name: "PostgreSQL",
        category: "DATABASE",
        proficiency: 3,
        displayOrder: 2,
        status: "PUBLISHED",
      },
      {
        name: "Docker",
        category: "TOOL",
        proficiency: 3,
        displayOrder: 3,
        status: "PUBLISHED",
      },
    ])
    .returning();

  const [sampleProject] = await db
    .insert(project)
    .values({
      title: "[SAMPLE] Example Project",
      slug: "sample-example-project",
      description:
        "[SAMPLE] Placeholder project description — replace via /admin/projects.",
      featured: true,
      displayOrder: 0,
      status: "PUBLISHED",
    })
    .returning();

  if (sampleProject) {
    await db.insert(projectTechnology).values([
      { projectId: sampleProject.id, technology: "Next.js", displayOrder: 0 },
      {
        projectId: sampleProject.id,
        technology: "PostgreSQL",
        displayOrder: 1,
      },
    ]);
  }

  const [sampleCertification] = await db
    .insert(certification)
    .values({
      name: "[SAMPLE] Example Certification",
      issuer: "[SAMPLE] Example Issuer",
      issueDate: new Date("2023-01-01"),
      displayOrder: 0,
      status: "PUBLISHED",
    })
    .returning();

  const [sampleAchievement] = await db
    .insert(achievement)
    .values({
      title: "[SAMPLE] Example Achievement",
      description: "[SAMPLE] Placeholder — replace via /admin/achievements.",
      date: new Date("2023-06-01"),
      displayOrder: 0,
      status: "PUBLISHED",
    })
    .returning();

  await db.insert(socialLink).values([
    {
      platform: "GITHUB",
      url: "https://github.com/",
      label: "GitHub",
      displayOrder: 0,
      isVisible: true,
    },
    {
      platform: "LINKEDIN",
      url: "https://linkedin.com/",
      label: "LinkedIn",
      displayOrder: 1,
      isVisible: true,
    },
  ]);

  // PortfolioSection rows define what renders and in what order (docs/database-design.md §3).
  // Certifications/Achievements/Services start hidden since the sample data
  // above is not real content yet — enable them via /admin/layout once populated.
  await db.insert(portfolioSection).values([
    { key: "HERO", isVisible: true, displayOrder: 0 },
    { key: "ABOUT", isVisible: true, displayOrder: 1 },
    { key: "EXPERIENCE", isVisible: true, displayOrder: 2 },
    { key: "PROJECTS", isVisible: true, displayOrder: 3 },
    { key: "SKILLS", isVisible: true, displayOrder: 4 },
    { key: "EDUCATION", isVisible: true, displayOrder: 5 },
    { key: "CERTIFICATIONS", isVisible: false, displayOrder: 6 },
    { key: "ACHIEVEMENTS", isVisible: false, displayOrder: 7 },
    { key: "SERVICES", isVisible: false, displayOrder: 8 },
    { key: "CONTACT", isVisible: true, displayOrder: 9 },
  ]);

  // One KnowledgeDocument per knowledge-eligible entity (docs/database-
  // design.md §4) — bulk-created here just so the AI Knowledge dashboard
  // isn't empty out of the box; new entities created afterward get theirs
  // lazily, the first time their edit page is opened (Phase 8 has no
  // content-change-event wiring yet — that's Phase 9).
  const knowledgeDocs: NewKnowledgeDocument[] = [];
  if (sampleAbout)
    knowledgeDocs.push({ sourceType: "ABOUT", sourceEntityId: sampleAbout.id });
  for (const row of sampleExperience)
    knowledgeDocs.push({ sourceType: "EXPERIENCE", sourceEntityId: row.id });
  if (sampleEducation)
    knowledgeDocs.push({
      sourceType: "EDUCATION",
      sourceEntityId: sampleEducation.id,
    });
  for (const row of sampleSkills)
    knowledgeDocs.push({ sourceType: "SKILL", sourceEntityId: row.id });
  if (sampleProject)
    knowledgeDocs.push({
      sourceType: "PROJECT",
      sourceEntityId: sampleProject.id,
    });
  if (sampleCertification)
    knowledgeDocs.push({
      sourceType: "CERTIFICATION",
      sourceEntityId: sampleCertification.id,
    });
  if (sampleAchievement)
    knowledgeDocs.push({
      sourceType: "ACHIEVEMENT",
      sourceEntityId: sampleAchievement.id,
    });
  if (knowledgeDocs.length > 0) {
    await db.insert(knowledgeDocument).values(knowledgeDocs);
  }

  // Theme presets (immutable) + one active Theme cloned from "Glass" — an
  // unmodified activation is a visual no-op since this config matches the
  // hand-authored defaults in globals.css exactly (docs/architecture.md §13-16).
  const [glassPreset] = await db
    .insert(themePreset)
    .values({ name: "Glass", config: DEFAULT_THEME_CONFIG })
    .returning();
  await db
    .insert(themePreset)
    .values({ name: "Minimal", config: MINIMAL_THEME_CONFIG });
  await db
    .insert(themePreset)
    .values({ name: "Emerald", config: EMERALD_THEME_CONFIG });

  if (glassPreset) {
    await db.insert(theme).values({
      name: "Glass",
      basePresetId: glassPreset.id,
      config: glassPreset.config,
      isActive: true,
    });
  }

  console.log("Seed complete.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
