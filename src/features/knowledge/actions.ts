"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import {
  achievement,
  certification,
  education,
  experience,
  knowledgeDocument,
  project,
  skill,
  type KnowledgeDocument,
} from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { parseFaqs } from "./faqs";
import { enqueueKnowledgeIndexing } from "@/lib/queue/knowledge-indexing-queue";

const updateSchema = z.object({
  includeInRag: z.string().optional(), // checkbox: "on" or absent
  additionalContext: z.string().max(20000).optional().or(z.literal("")),
  faqsText: z.string().max(20000), // "question|answer" per line, same pattern as About's highlights
  priority: z.coerce.number().int().min(0).max(100),
  visibility: z.enum(["DRAFT", "PUBLISHED"]),
});

/**
 * Every knowledge-eligible entity gets exactly one document, created lazily
 * the first time its admin edit page is opened — there's no content-change
 * event wiring yet (that's Phase 9's "automatic knowledge synchronization",
 * master prompt §19); for now this is just the config surface.
 */
export async function getOrCreateKnowledgeDocument(
  sourceType: KnowledgeDocument["sourceType"],
  sourceEntityId: string,
): Promise<KnowledgeDocument> {
  await requirePermissionInAction(PERMISSIONS.AI_KNOWLEDGE_WRITE);

  const [existing] = await db
    .select()
    .from(knowledgeDocument)
    .where(
      and(
        eq(knowledgeDocument.sourceType, sourceType),
        eq(knowledgeDocument.sourceEntityId, sourceEntityId),
        isNull(knowledgeDocument.deletedAt),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(knowledgeDocument)
    .values({ sourceType, sourceEntityId })
    .returning();
  if (!created) throw new Error("Failed to create knowledge document.");
  return created;
}

export async function updateKnowledgeDocument(
  id: string,
  redirectPath: string,
  formData: FormData,
) {
  const user = await requirePermissionInAction(PERMISSIONS.AI_KNOWLEDGE_WRITE);
  const parsed = updateSchema.parse(Object.fromEntries(formData));

  const [current] = await db
    .select()
    .from(knowledgeDocument)
    .where(eq(knowledgeDocument.id, id))
    .limit(1);
  if (!current) throw new Error("Knowledge document not found.");

  await db
    .update(knowledgeDocument)
    .set({
      includeInRag: parsed.includeInRag === "on",
      additionalContext: parsed.additionalContext || null,
      faqs: parseFaqs(parsed.faqsText),
      priority: parsed.priority,
      visibility: parsed.visibility,
      version: current.version + 1,
      // Content changed — stale until (Phase 9's) indexing worker catches up.
      indexStatus: "PENDING",
    })
    .where(eq(knowledgeDocument.id, id));

  await recordAuditLog({
    adminUserId: user.id,
    action: "knowledge_document.update",
    targetType: "knowledge_document",
    targetId: id,
  });
  await enqueueKnowledgeIndexing(id);
  revalidatePath(redirectPath);
  revalidatePath("/admin/ai/knowledge");
}

/** Manual re-index trigger — the "Re-index" button on the AI Knowledge dashboard, for when nothing about the content changed but the admin wants to force a refresh (e.g. after a Phase 9 pipeline bugfix). */
export async function reindexKnowledgeDocument(id: string) {
  await requirePermissionInAction(PERMISSIONS.AI_KNOWLEDGE_WRITE);
  await db
    .update(knowledgeDocument)
    .set({ indexStatus: "PENDING" })
    .where(eq(knowledgeDocument.id, id));
  await enqueueKnowledgeIndexing(id);
  revalidatePath("/admin/ai/knowledge");
}

type EntityLabelResolver = (id: string) => Promise<string | null>;

const LABEL_RESOLVERS: Partial<
  Record<KnowledgeDocument["sourceType"], EntityLabelResolver>
> = {
  ABOUT: async () => "About (site bio)",
  EXPERIENCE: async (id) => {
    const [row] = await db
      .select({ role: experience.role, company: experience.company })
      .from(experience)
      .where(eq(experience.id, id))
      .limit(1);
    return row ? `${row.role} — ${row.company}` : null;
  },
  EDUCATION: async (id) => {
    const [row] = await db
      .select({ institution: education.institution, degree: education.degree })
      .from(education)
      .where(eq(education.id, id))
      .limit(1);
    return row ? `${row.degree} — ${row.institution}` : null;
  },
  SKILL: async (id) => {
    const [row] = await db
      .select({ name: skill.name })
      .from(skill)
      .where(eq(skill.id, id))
      .limit(1);
    return row?.name ?? null;
  },
  PROJECT: async (id) => {
    const [row] = await db
      .select({ title: project.title })
      .from(project)
      .where(eq(project.id, id))
      .limit(1);
    return row?.title ?? null;
  },
  CERTIFICATION: async (id) => {
    const [row] = await db
      .select({ name: certification.name })
      .from(certification)
      .where(eq(certification.id, id))
      .limit(1);
    return row?.name ?? null;
  },
  ACHIEVEMENT: async (id) => {
    const [row] = await db
      .select({ title: achievement.title })
      .from(achievement)
      .where(eq(achievement.id, id))
      .limit(1);
    return row?.title ?? null;
  },
};

export async function listAllKnowledgeDocuments(): Promise<
  (KnowledgeDocument & { entityLabel: string })[]
> {
  await requirePermissionInAction(PERMISSIONS.AI_KNOWLEDGE_WRITE);

  const docs = await db
    .select()
    .from(knowledgeDocument)
    .where(isNull(knowledgeDocument.deletedAt));

  return Promise.all(
    docs.map(async (doc) => {
      const resolver = LABEL_RESOLVERS[doc.sourceType];
      const label =
        doc.sourceEntityId && resolver
          ? await resolver(doc.sourceEntityId)
          : null;
      return { ...doc, entityLabel: label ?? "(deleted or unresolved entity)" };
    }),
  );
}
