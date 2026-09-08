"use server";

import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { project, projectTechnology } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { computeReorderSwap } from "@/lib/db/reorder";
import {
  syncKnowledgeForEntity,
  retireKnowledgeForEntity,
} from "@/features/knowledge/sync";

const projectSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens only.",
    ),
  description: z.string().min(1).max(2000),
  longDescription: z.string().max(10000).optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  liveUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  featured: z.string().optional(), // checkbox: present ("on") or absent
  technologies: z.string().max(2000),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

function parseTechnologies(raw: string): string[] {
  return raw
    .split(",")
    .map((tech) => tech.trim())
    .filter(Boolean);
}

async function replaceTechnologies(projectId: string, technologies: string[]) {
  await db
    .delete(projectTechnology)
    .where(eq(projectTechnology.projectId, projectId));
  if (technologies.length > 0) {
    await db.insert(projectTechnology).values(
      technologies.map((technology, index) => ({
        projectId,
        technology,
        displayOrder: index,
      })),
    );
  }
}

async function nextDisplayOrder(): Promise<number> {
  const rows = await db
    .select({ displayOrder: project.displayOrder })
    .from(project)
    .orderBy(asc(project.displayOrder));
  return rows.length === 0
    ? 0
    : Math.max(...rows.map((r) => r.displayOrder)) + 1;
}

export async function createProject(formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = projectSchema.parse(Object.fromEntries(formData));

  const [row] = await db
    .insert(project)
    .values({
      title: parsed.title,
      slug: parsed.slug,
      description: parsed.description,
      longDescription: parsed.longDescription || null,
      coverImageUrl: parsed.coverImageUrl || null,
      liveUrl: parsed.liveUrl || null,
      githubUrl: parsed.githubUrl || null,
      featured: parsed.featured === "on",
      status: parsed.status,
      displayOrder: await nextDisplayOrder(),
    })
    .returning();

  if (row) {
    await replaceTechnologies(row.id, parseTechnologies(parsed.technologies));
  }

  await recordAuditLog({
    adminUserId: user.id,
    action: "project.create",
    targetType: "project",
    targetId: row?.id,
  });
  if (row) await syncKnowledgeForEntity("PROJECT", row.id);
  revalidatePath("/admin/projects");
  revalidatePath("/");
  redirect("/admin/projects");
}

export async function updateProject(id: string, formData: FormData) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  const parsed = projectSchema.parse(Object.fromEntries(formData));

  await db
    .update(project)
    .set({
      title: parsed.title,
      slug: parsed.slug,
      description: parsed.description,
      longDescription: parsed.longDescription || null,
      coverImageUrl: parsed.coverImageUrl || null,
      liveUrl: parsed.liveUrl || null,
      githubUrl: parsed.githubUrl || null,
      featured: parsed.featured === "on",
      status: parsed.status,
    })
    .where(eq(project.id, id));

  await replaceTechnologies(id, parseTechnologies(parsed.technologies));

  await recordAuditLog({
    adminUserId: user.id,
    action: "project.update",
    targetType: "project",
    targetId: id,
  });
  await syncKnowledgeForEntity("PROJECT", id);
  revalidatePath("/admin/projects");
  revalidatePath("/");
  redirect("/admin/projects");
}

export async function deleteProject(id: string) {
  const user = await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);
  await db
    .update(project)
    .set({ deletedAt: new Date() })
    .where(eq(project.id, id));
  await recordAuditLog({
    adminUserId: user.id,
    action: "project.delete",
    targetType: "project",
    targetId: id,
  });
  await retireKnowledgeForEntity("PROJECT", id);
  revalidatePath("/admin/projects");
  revalidatePath("/");
}

export async function moveProject(direction: "up" | "down", id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_WRITE);

  const items = await db
    .select({ id: project.id, displayOrder: project.displayOrder })
    .from(project)
    .where(isNull(project.deletedAt))
    .orderBy(asc(project.displayOrder));

  const swap = computeReorderSwap(items, id, direction);
  if (!swap) return;
  const [a, b] = swap;

  await db.transaction(async (tx) => {
    await tx
      .update(project)
      .set({ displayOrder: b.displayOrder })
      .where(eq(project.id, a.id));
    await tx
      .update(project)
      .set({ displayOrder: a.displayOrder })
      .where(eq(project.id, b.id));
  });

  revalidatePath("/admin/projects");
  revalidatePath("/");
}

export async function listProjects() {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  return db
    .select()
    .from(project)
    .where(isNull(project.deletedAt))
    .orderBy(asc(project.displayOrder));
}

export async function getProjectById(id: string) {
  await requirePermissionInAction(PERMISSIONS.CONTENT_READ);
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, id), isNull(project.deletedAt)))
    .limit(1);
  if (!row) return null;

  const technologies = await db
    .select()
    .from(projectTechnology)
    .where(eq(projectTechnology.projectId, id))
    .orderBy(asc(projectTechnology.displayOrder));

  return { ...row, technologies };
}
