import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  getPublishedExperience,
  getPublishedProjects,
  getPublishedSkills,
} from "@/features/portfolio/queries";
import { getActiveResumeMeta } from "@/features/resume/queries";
import { buildContext } from "@/features/rag/context-builder";

/**
 * Every tool the chat model can call (master prompt §32-33, §72): strict
 * Zod input schema, and — critically — each one only ever reads already-
 * PUBLISHED content through the exact same `features/*` query functions the
 * public site itself uses. There is no path from any tool to draft content,
 * another visitor's data, raw SQL, or the filesystem/shell. The LLM decides
 * *whether* to call a tool; it never becomes the authorization boundary —
 * these functions would return the same safe, published-only data even if
 * called with adversarial arguments.
 *
 * The master prompt's example list also names a `searchKnowledge` tool
 * alongside `searchPortfolio`. Both would search the exact same
 * `knowledge_chunk` corpus in this implementation — shipping a second tool
 * that's a byte-for-byte duplicate of the first would be a fake feature
 * (master prompt §97), so only `searchPortfolio` is implemented.
 */

export const searchPortfolioTool = tool(
  async ({ query }: { query: string }) => {
    const context = await buildContext(query);
    return (
      context.text || "No matching portfolio knowledge found for this query."
    );
  },
  {
    name: "searchPortfolio",
    description:
      "Search the portfolio owner's indexed knowledge (experience, projects, skills, education, certifications, achievements, and their FAQs) for content relevant to a specific question.",
    schema: z.object({ query: z.string().min(1).max(300) }),
  },
);

export const getProjectTool = tool(
  async ({ slug }: { slug: string }) => {
    const projects = await getPublishedProjects();
    const project = projects.find((p) => p.slug === slug);
    if (!project) return `No published project found with slug "${slug}".`;
    return JSON.stringify({
      title: project.title,
      description: project.description,
      longDescription: project.longDescription,
      liveUrl: project.liveUrl,
      githubUrl: project.githubUrl,
      technologies: project.technologies.map((t) => t.technology),
    });
  },
  {
    name: "getProject",
    description:
      "Look up a specific published project's full structured details — including its live URL and GitHub URL, which aren't always present in search results — by its slug.",
    schema: z.object({ slug: z.string().min(1).max(200) }),
  },
);

export const getExperienceTool = tool(
  async () => {
    const items = await getPublishedExperience();
    return JSON.stringify(
      items.map((e) => ({
        role: e.role,
        company: e.company,
        startDate: e.startDate,
        endDate: e.endDate,
        description: e.description,
        technologies: e.technologies,
      })),
    );
  },
  {
    name: "getExperience",
    description:
      "List every published work experience entry with role, company, dates, description, and technologies.",
    schema: z.object({}),
  },
);

export const getSkillsTool = tool(
  async () => {
    const items = await getPublishedSkills();
    return JSON.stringify(
      items.map((s) => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
      })),
    );
  },
  {
    name: "getSkills",
    description:
      "List every published skill with its category and proficiency level.",
    schema: z.object({}),
  },
);

export const getResumeMetadataTool = tool(
  async () => {
    const meta = await getActiveResumeMeta();
    if (!meta) return "No resume is currently available for download.";
    return `A resume is available (file: ${meta.fileName}). Direct visitors to download it at /api/resume.`;
  },
  {
    name: "getResumeMetadata",
    description:
      "Check whether a downloadable resume/CV is currently available, without exposing the file itself.",
    schema: z.object({}),
  },
);

export const CHAT_TOOLS = [
  searchPortfolioTool,
  getProjectTool,
  getExperienceTool,
  getSkillsTool,
  getResumeMetadataTool,
];
