import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRun,
  getRunResults,
  getRunSummary,
} from "@/features/evaluation/queries";

function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export default async function EvaluationRunPage({
  params,
}: {
  params: Promise<{ datasetId: string; runId: string }>;
}) {
  const { datasetId, runId } = await params;
  const run = await getRun(runId);
  if (!run || run.datasetId !== datasetId) notFound();

  const [summary, results] = await Promise.all([
    getRunSummary(runId),
    getRunResults(runId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/ai/evaluation/${datasetId}`}
          className="text-primary text-sm hover:underline"
        >
          ← Dataset
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          Run — {run.startedAt.toLocaleString()}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Status: {run.status} · Model: {run.model} · Prompt v
          {run.promptVersion} · {summary.caseCount} case
          {summary.caseCount === 1 ? "" : "s"} scored
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-muted-foreground text-xs">Retrieval relevance</p>
          <p className="text-2xl font-semibold">
            {pct(summary.avgRetrievalRelevance)}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-muted-foreground text-xs">Context recall</p>
          <p className="text-2xl font-semibold">
            {pct(summary.avgContextRecall)}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-muted-foreground text-xs">Answer relevance</p>
          <p className="text-2xl font-semibold">
            {pct(summary.avgAnswerRelevance)}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-muted-foreground text-xs">Faithfulness</p>
          <p className="text-2xl font-semibold">
            {pct(summary.avgFaithfulness)}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-muted-foreground text-xs">Answer correctness</p>
          <p className="text-2xl font-semibold">
            {pct(summary.avgAnswerCorrectness)}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-muted-foreground text-xs">Hallucination rate</p>
          <p className="text-2xl font-semibold">
            {pct(summary.hallucinationRate)}
          </p>
        </div>
      </div>

      <section className="glass space-y-3 rounded-2xl p-6">
        <h2 className="font-semibold">Per-case results</h2>
        {results.length === 0 ? (
          <p className="text-muted-foreground text-sm">No results yet.</p>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="border-border space-y-2 rounded-xl border p-4 text-sm"
              >
                <p className="font-medium">{result.question}</p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {result.actualAnswer}
                </p>
                {result.expectedAnswer && (
                  <p className="text-muted-foreground text-xs">
                    Expected: {result.expectedAnswer}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  <span className="bg-surface rounded-full px-2 py-0.5">
                    Retrieval {pct(result.retrievalRelevance)}
                  </span>
                  <span className="bg-surface rounded-full px-2 py-0.5">
                    Recall {pct(result.contextRecall)}
                  </span>
                  <span className="bg-surface rounded-full px-2 py-0.5">
                    Relevance {pct(result.answerRelevance)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${result.hallucinated ? "bg-red-500/10 text-red-400" : "bg-surface"}`}
                  >
                    {result.hallucinated ? "Hallucinated" : "Faithful"}
                  </span>
                  <span className="bg-surface rounded-full px-2 py-0.5">
                    Correctness {pct(result.answerCorrectness)}
                  </span>
                </div>
                {result.notes && (
                  <p className="text-xs text-red-400">{result.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
