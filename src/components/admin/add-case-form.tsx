"use client";

import { useState, useTransition } from "react";
import { addCase } from "@/features/evaluation/actions";

export function AddCaseForm({ datasetId }: { datasetId: string }) {
  const [question, setQuestion] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [expectedSources, setExpectedSources] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      await addCase({ datasetId, question, expectedAnswer, expectedSources });
      setQuestion("");
      setExpectedAnswer("");
      setExpectedSources("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass space-y-3 rounded-2xl p-4">
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Question, e.g. What backend technologies does he use?"
        className="border-border bg-surface focus:border-primary focus:ring-primary w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1"
      />
      <textarea
        value={expectedAnswer}
        onChange={(e) => setExpectedAnswer(e.target.value)}
        placeholder="Expected answer (optional — leave blank for adversarial/out-of-scope cases, where the graph's own canned rejection IS the expected behavior)"
        rows={2}
        className="border-border bg-surface focus:border-primary focus:ring-primary w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1"
      />
      <input
        type="text"
        value={expectedSources}
        onChange={(e) => setExpectedSources(e.target.value)}
        placeholder="Expected source entity IDs, comma-separated (optional — see /admin/ai/knowledge for real ids)"
        className="border-border bg-surface focus:border-primary focus:ring-primary w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1"
      />
      <button
        type="submit"
        disabled={isPending || question.trim().length === 0}
        className="bg-primary text-primary-foreground rounded-full px-6 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Adding..." : "Add case"}
      </button>
    </form>
  );
}
