import "server-only";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  about,
  achievement,
  certification,
  education,
  experience,
  portfolioSection,
  profile,
  project,
  projectTechnology,
  skill,
  socialLink,
  type ProjectTechnology,
} from "@/lib/db/schema";

/**
 * Public-facing reads only — every query here filters to PUBLISHED (+ not
 * soft-deleted) content (docs/database-design.md conventions). This module
 * is what the (public) route group renders from; it never exposes DRAFT or
 * ARCHIVED rows, regardless of what the admin CRUD screens can see.
 */

export async function getProfile() {
  const [row] = await db.select().from(profile).limit(1);
  return row ?? null;
}

export async function getAbout() {
  const [row] = await db.select().from(about).limit(1);
  return row ?? null;
}

export function getVisibleSections() {
  return db
    .select()
    .from(portfolioSection)
    .where(eq(portfolioSection.isVisible, true))
    .orderBy(asc(portfolioSection.displayOrder));
}

export function getPublishedExperience() {
  return db
    .select()
    .from(experience)
    .where(
      and(eq(experience.status, "PUBLISHED"), isNull(experience.deletedAt)),
    )
    .orderBy(asc(experience.displayOrder));
}

export function getPublishedEducation() {
  return db
    .select()
    .from(education)
    .where(and(eq(education.status, "PUBLISHED"), isNull(education.deletedAt)))
    .orderBy(asc(education.displayOrder));
}

export function getPublishedSkills() {
  return db
    .select()
    .from(skill)
    .where(eq(skill.status, "PUBLISHED"))
    .orderBy(asc(skill.displayOrder));
}

export function getPublishedCertifications() {
  return db
    .select()
    .from(certification)
    .where(
      and(
        eq(certification.status, "PUBLISHED"),
        isNull(certification.deletedAt),
      ),
    )
    .orderBy(asc(certification.displayOrder));
}

export function getPublishedAchievements() {
  return db
    .select()
    .from(achievement)
    .where(
      and(eq(achievement.status, "PUBLISHED"), isNull(achievement.deletedAt)),
    )
    .orderBy(asc(achievement.displayOrder));
}

export function getVisibleSocialLinks() {
  return db
    .select()
    .from(socialLink)
    .where(eq(socialLink.isVisible, true))
    .orderBy(asc(socialLink.displayOrder));
}

export type ProjectWithTechnologies = typeof project.$inferSelect & {
  technologies: ProjectTechnology[];
};

export async function getPublishedProjects(): Promise<
  ProjectWithTechnologies[]
> {
  const projects = await db
    .select()
    .from(project)
    .where(and(eq(project.status, "PUBLISHED"), isNull(project.deletedAt)))
    .orderBy(asc(project.displayOrder));

  if (projects.length === 0) return [];

  const technologies = await db
    .select()
    .from(projectTechnology)
    .where(
      inArray(
        projectTechnology.projectId,
        projects.map((p) => p.id),
      ),
    )
    .orderBy(asc(projectTechnology.displayOrder));

  const technologiesByProject = new Map<string, ProjectTechnology[]>();
  for (const tech of technologies) {
    const list = technologiesByProject.get(tech.projectId) ?? [];
    list.push(tech);
    technologiesByProject.set(tech.projectId, list);
  }

  return projects.map((p) => ({
    ...p,
    technologies: technologiesByProject.get(p.id) ?? [],
  }));
}
