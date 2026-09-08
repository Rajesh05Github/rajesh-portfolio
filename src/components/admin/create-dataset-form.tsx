"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDataset } from "@/features/evaluation/actions";

export function CreateDatasetForm() {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await createDataset(name);
        setName("");
        router.push(`/admin/ai/evaluation/${id}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create dataset.",
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass flex gap-3 rounded-2xl p-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Core portfolio Q&A"
        className="border-border bg-surface focus:border-primary focus:ring-primary flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-1"
      />
      <button
        type="submit"
        disabled={isPending || name.trim().length === 0}
        className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Creating..." : "New dataset"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
