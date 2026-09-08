"use client";

import { useState, useTransition } from "react";
import { testRagQuery, type RagTestResult } from "@/features/rag/actions";

export function RagTestForm() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<RagTestResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      setResult(await testRagQuery(query));
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="glass flex gap-3 rounded-2xl p-4"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. What backend technologies does he use?"
          className="border-border bg-surface focus:border-primary focus:ring-primary flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-1"
        />
        <button
          type="submit"
          disabled={isPending || query.trim().length === 0}
          className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "Running..." : "Test query"}
        </button>
      </form>

      {result && !result.ok && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {result.error}
        </div>
      )}

      {result?.ok && (
        <div className="space-y-6">
          <section className="glass space-y-3 rounded-2xl p-6">
            <h2 className="font-semibold">
              Assembled context ({result.context.chunkIds.length} chunks)
            </h2>
            {result.context.text ? (
              <pre className="bg-surface max-h-96 overflow-auto rounded-xl p-4 text-xs whitespace-pre-wrap">
                {result.context.text}
              </pre>
            ) : (
              <p className="text-muted-foreground text-sm">
                No published, in-RAG, indexed chunks matched this query —
                nothing to show. If you expect a match, check that the relevant
                AI Knowledge document is published and indexed (see
                /admin/ai/knowledge).
              </p>
            )}
          </section>

          {result.context.allScored.length > 0 && (
            <section className="glass space-y-3 rounded-2xl p-6">
              <h2 className="font-semibold">All candidates, ranked</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="text-muted-foreground border-border border-b text-left">
                    <tr>
                      <th className="p-2">Source</th>
                      <th className="p-2">Vector</th>
                      <th className="p-2">Keyword</th>
                      <th className="p-2">Hybrid</th>
                      <th className="p-2">Rerank</th>
                      <th className="p-2">Used?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.context.allScored.map((chunk) => (
                      <tr
                        key={chunk.id}
                        className="border-border border-b last:border-0"
                      >
                        <td className="text-muted-foreground p-2">
                          {String(chunk.metadata.sourceType ?? "?")} —{" "}
                          {String(chunk.metadata.title ?? "?")}
                        </td>
                        <td className="p-2">{chunk.vectorScore.toFixed(3)}</td>
                        <td className="p-2">{chunk.keywordScore.toFixed(3)}</td>
                        <td className="p-2">{chunk.hybridScore.toFixed(3)}</td>
                        <td className="p-2">{chunk.rerankScore.toFixed(1)}</td>
                        <td className="p-2">
                          {result.context.chunkIds.includes(chunk.id)
                            ? "Yes"
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
