import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { resume } from "@/lib/db/schema";

/** Public read — just enough for the Hero "Download CV" button to know whether to render at all. */
export async function getActiveResumeMeta(): Promise<{
  fileName: string;
} | null> {
  const [row] = await db
    .select({ fileName: resume.fileName })
    .from(resume)
    .where(eq(resume.isActive, true))
    .limit(1);
  return row ?? null;
}
