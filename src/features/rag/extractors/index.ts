import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  about,
  achievement,
  certification,
  education,
  experience,
  profile,
  project,
  projectTechnology,
  skill,
  type KnowledgeDocument,
} from "@/lib/db/schema";
import { chunkLongText } from "../chunking";

export type ExtractedChunk = {
  content: string;
  metadata: Record<string, unknown>;
};
export type ExtractedDocument = { title: string; chunks: ExtractedChunk[] };

const SKILL_CATEGORY_LABELS: Record<
  (typeof skill.$inferSelect)["category"],
  string
> = {
  LANGUAGE: "a programming language",
  FRAMEWORK: "a framework",
  DATABASE: "a database technology",
  TOOL: "a tool",
  PLATFORM: "a platform",
  SOFT_SKILL: "a soft skill",
};

function baseMetadata(doc: KnowledgeDocument, title: string) {
  return {
    documentId: doc.id,
    sourceType: doc.sourceType,
    sourceEntityId: doc.sourceEntityId,
    title,
    priority: doc.priority,
    version: doc.version,
  };
}

/** FAQs are a universal KnowledgeDocument field (Phase 8), not Project-specific as originally sketched in docs/rag.md §3 — each FAQ becomes its own retrievable chunk regardless of sourceType, since a visitor's question maps far better to one focused Q&A chunk than to a diluted mega-chunk. */
function faqChunks(doc: KnowledgeDocument, title: string): ExtractedChunk[] {
  return doc.faqs.map((faq) => ({
    content: `Q: ${faq.question}\nA: ${faq.answer}`,
    metadata: { ...baseMetadata(doc, title), contentType: "faq" },
  }));
}

async function extractAbout(
  doc: KnowledgeDocument,
): Promise<ExtractedDocument | null> {
  if (!doc.sourceEntityId) return null;
  const [row] = await db
    .select()
    .from(about)
    .where(eq(about.id, doc.sourceEntityId))
    .limit(1);
  if (!row) return null;

  const title = "About";
  const parts: string[] = [];
  // PROFILE has no knowledge extractor of its own (see the doc comment on
  // extractDocument below) — without this, a visitor asking "who is the
  // owner" or "what's their name" has no grounded chunk to retrieve at all,
  // since nothing else in the knowledge base ever states the name. About is
  // the one document that's always published whenever the site has any
  // content worth indexing, so it's the natural place for this one fact.
  const [profileRow] = await db.select().from(profile).limit(1);
  if (profileRow) {
    parts.push(
      `${profileRow.name} is the owner of this portfolio.${profileRow.headline ? ` They work as a ${profileRow.headline}.` : ""}`,
    );
  }
  parts.push(row.bio);
  if (row.missionQuote) parts.push(`Mission: ${row.missionQuote}`);
  for (const highlight of row.highlights)
    parts.push(`${highlight.title}: ${highlight.description}`);
  if (doc.additionalContext) parts.push(doc.additionalContext);

  const splitParts = await chunkLongText(parts.join("\n\n"));
  const chunks = splitParts.map((content) => ({
    content,
    metadata: { ...baseMetadata(doc, title), contentType: "bio" },
  }));

  return { title, chunks: [...chunks, ...faqChunks(doc, title)] };
}

async function extractExperience(
  doc: KnowledgeDocument,
): Promise<ExtractedDocument | null> {
  if (!doc.sourceEntityId) return null;
  const [row] = await db
    .select()
    .from(experience)
    .where(eq(experience.id, doc.sourceEntityId))
    .limit(1);
  if (!row) return null;

  const title = `${row.role} at ${row.company}`;
  const period = `${row.startDate.toISOString().slice(0, 7)} to ${row.endDate ? row.endDate.toISOString().slice(0, 7) : "present"}`;
  const parts = [
    `${title} (${period}).`,
    row.description,
    row.technologies.length > 0
      ? `Technologies used: ${row.technologies.join(", ")}.`
      : "",
    doc.additionalContext ?? "",
  ].filter(Boolean);

  return {
    title,
    chunks: [
      {
        content: parts.join(" "),
        metadata: { ...baseMetadata(doc, title), contentType: "experience" },
      },
      ...faqChunks(doc, title),
    ],
  };
}

async function extractEducation(
  doc: KnowledgeDocument,
): Promise<ExtractedDocument | null> {
  if (!doc.sourceEntityId) return null;
  const [row] = await db
    .select()
    .from(education)
    .where(eq(education.id, doc.sourceEntityId))
    .limit(1);
  if (!row) return null;

  const title = `${row.degree} — ${row.institution}`;
  const parts = [
    `${title}${row.field ? ` in ${row.field}` : ""}.`,
    row.description ?? "",
    doc.additionalContext ?? "",
  ].filter(Boolean);

  return {
    title,
    chunks: [
      {
        content: parts.join(" "),
        metadata: { ...baseMetadata(doc, title), contentType: "education" },
      },
      ...faqChunks(doc, title),
    ],
  };
}

async function extractSkill(
  doc: KnowledgeDocument,
): Promise<ExtractedDocument | null> {
  if (!doc.sourceEntityId) return null;
  const [row] = await db
    .select()
    .from(skill)
    .where(eq(skill.id, doc.sourceEntityId))
    .limit(1);
  if (!row) return null;

  const categoryLabel = SKILL_CATEGORY_LABELS[row.category];
  const title = row.name;
  const parts = [
    `${row.name} (${categoryLabel}${row.proficiency ? `, proficiency ${row.proficiency}/5` : ""}).`,
    doc.additionalContext ?? "",
  ].filter(Boolean);

  return {
    title,
    chunks: [
      {
        content: parts.join(" "),
        metadata: { ...baseMetadata(doc, title), contentType: "skill" },
      },
      ...faqChunks(doc, title),
    ],
  };
}

async function extractProject(
  doc: KnowledgeDocument,
): Promise<ExtractedDocument | null> {
  if (!doc.sourceEntityId) return null;
  const [row] = await db
    .select()
    .from(project)
    .where(eq(project.id, doc.sourceEntityId))
    .limit(1);
  if (!row) return null;

  const technologies = await db
    .select({ technology: projectTechnology.technology })
    .from(projectTechnology)
    .where(eq(projectTechnology.projectId, row.id));

  const title = row.title;
  const parts = [
    row.description,
    row.longDescription ?? "",
    technologies.length > 0
      ? `Built with: ${technologies.map((t) => t.technology).join(", ")}.`
      : "",
    doc.additionalContext ?? "",
  ].filter(Boolean);

  return {
    title,
    chunks: [
      {
        content: parts.join(" "),
        metadata: { ...baseMetadata(doc, title), contentType: "project" },
      },
      ...faqChunks(doc, title),
    ],
  };
}

async function extractCertification(
  doc: KnowledgeDocument,
): Promise<ExtractedDocument | null> {
  if (!doc.sourceEntityId) return null;
  const [row] = await db
    .select()
    .from(certification)
    .where(eq(certification.id, doc.sourceEntityId))
    .limit(1);
  if (!row) return null;

  const title = row.name;
  const parts = [
    `${row.name}, issued by ${row.issuer}.`,
    doc.additionalContext ?? "",
  ].filter(Boolean);

  return {
    title,
    chunks: [
      {
        content: parts.join(" "),
        metadata: { ...baseMetadata(doc, title), contentType: "certification" },
      },
      ...faqChunks(doc, title),
    ],
  };
}

async function extractAchievement(
  doc: KnowledgeDocument,
): Promise<ExtractedDocument | null> {
  if (!doc.sourceEntityId) return null;
  const [row] = await db
    .select()
    .from(achievement)
    .where(eq(achievement.id, doc.sourceEntityId))
    .limit(1);
  if (!row) return null;

  const title = row.title;
  const parts = [
    `${row.title}.`,
    row.description ?? "",
    doc.additionalContext ?? "",
  ].filter(Boolean);

  return {
    title,
    chunks: [
      {
        content: parts.join(" "),
        metadata: { ...baseMetadata(doc, title), contentType: "achievement" },
      },
      ...faqChunks(doc, title),
    ],
  };
}

/**
 * PROFILE, RESUME, FAQ, CUSTOM are valid `sourceType` values (schema is
 * forward-compatible) but have no extractor yet — Phase 8 didn't build an
 * AI Knowledge UI for Profile/Resume (see that phase's scope note), and no
 * FAQ/CUSTOM documents can exist yet since nothing creates one. Returning
 * null for these is correct today, not a gap silently swallowed: the
 * indexing worker treats a null extraction as "nothing to index," not a
 * failure.
 */
export async function extractDocument(
  doc: KnowledgeDocument,
): Promise<ExtractedDocument | null> {
  switch (doc.sourceType) {
    case "ABOUT":
      return extractAbout(doc);
    case "EXPERIENCE":
      return extractExperience(doc);
    case "EDUCATION":
      return extractEducation(doc);
    case "SKILL":
      return extractSkill(doc);
    case "PROJECT":
      return extractProject(doc);
    case "CERTIFICATION":
      return extractCertification(doc);
    case "ACHIEVEMENT":
      return extractAchievement(doc);
    default:
      return null;
  }
}
