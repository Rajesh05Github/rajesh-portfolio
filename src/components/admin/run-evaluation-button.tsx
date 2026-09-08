"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { triggerRun } from "@/features/evaluation/actions";

export function RunEvaluationButton({ datasetId }: { datasetId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await triggerRun(datasetId);
      if (result.ok) {
        router.push(`/admin/ai/evaluation/${datasetId}/runs/${result.runId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {isPending
          ? "Running evaluation... (this calls the real LLM for every case)"
          : "Run evaluation"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
