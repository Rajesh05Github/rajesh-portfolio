"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { evaluationCase, evaluationDataset } from "@/lib/db/schema";
import { requirePermissionInAction } from "@/lib/auth/require-admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { runEvaluation } from "./run-evaluation";

export async function createDataset(name: string): Promise<{ id: string }> {
  await requirePermissionInAction(PERMISSIONS.AI_KNOWLEDGE_WRITE);
  const parsed = z.string().trim().min(1).max(200).parse(name);

  const [dataset] = await db
    .insert(evaluationDataset)
    .values({ name: parsed })
    .returning();
  if (!dataset) throw new Error("Failed to create dataset.");
  revalidatePath("/admin/ai/evaluation");
  return { id: dataset.id };
}

const caseInputSchema = z.object({
  datasetId: z.string().uuid(),
  question: z.string().trim().min(1).max(1000),
  expectedAnswer: z.string().trim().max(2000).optional(),
  expectedSources: z.string().trim().max(2000).optional(),
});

/** `expectedSources` arrives as a comma-separated string from the admin form and is split/trimmed into the `string[]` the schema stores — simpler than a dynamic list-of-inputs UI for a v1 admin tool. */
export async function addCase(
  input: z.infer<typeof caseInputSchema>,
): Promise<void> {
  await requirePermissionInAction(PERMISSIONS.AI_KNOWLEDGE_WRITE);
  const parsed = caseInputSchema.parse(input);

  const expectedSources = parsed.expectedSources
    ? parsed.expectedSources
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  await db.insert(evaluationCase).values({
    datasetId: parsed.datasetId,
    question: parsed.question,
    expectedAnswer: parsed.expectedAnswer || null,
    expectedSources,
  });
  revalidatePath("/admin/ai/evaluation");
}

export async function deleteCase(caseId: string): Promise<void> {
  await requirePermissionInAction(PERMISSIONS.AI_KNOWLEDGE_WRITE);
  await db.delete(evaluationCase).where(eq(evaluationCase.id, caseId));
  revalidatePath("/admin/ai/evaluation");
}

export type TriggerRunResult =
  { ok: true; runId: string } | { ok: false; error: string };

export async function triggerRun(datasetId: string): Promise<TriggerRunResult> {
  await requirePermissionInAction(PERMISSIONS.AI_KNOWLEDGE_WRITE);
  try {
    const { runId } = await runEvaluation(datasetId);
    revalidatePath("/admin/ai/evaluation");
    return { ok: true, runId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Evaluation run failed.",
    };
  }
}
