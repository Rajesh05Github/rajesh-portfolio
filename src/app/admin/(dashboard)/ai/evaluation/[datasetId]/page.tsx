import Link from "next/link";
import { notFound } from "next/navigation";
import { AddCaseForm } from "@/components/admin/add-case-form";
import { RunEvaluationButton } from "@/components/admin/run-evaluation-button";
import { deleteCase } from "@/features/evaluation/actions";
import {
  getDataset,
  listCasesForDataset,
  listRunsForDataset,
} from "@/features/evaluation/queries";

const STATUS_STYLES: Record<string, string> = {
  RUNNING: "bg-primary/15 text-primary",
  COMPLETED: "bg-primary/15 text-primary",
  FAILED: "bg-red-500/10 text-red-400",
};

export default async function EvaluationDatasetPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  const dataset = await getDataset(datasetId);
  if (!dataset) notFound();

  const [cases, runs] = await Promise.all([
    listCasesForDataset(datasetId),
    listRunsForDataset(datasetId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/ai/evaluation"
          className="text-primary text-sm hover:underline"
        >
          ← All datasets
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{dataset.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Version {dataset.version}
        </p>
      </div>

      <section className="glass space-y-3 rounded-2xl p-6">
        <h2 className="font-semibold">Cases ({cases.length})</h2>
        {cases.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No cases yet — add at least one below before running.
          </p>
        ) : (
          <div className="space-y-2">
            {cases.map((c) => (
              <div
                key={c.id}
                className="border-border flex items-start justify-between gap-3 rounded-xl border p-3 text-sm"
              >
                <div className="space-y-1">
                  <p className="font-medium">{c.question}</p>
                  {c.expectedAnswer && (
                    <p className="text-muted-foreground">
                      Expected: {c.expectedAnswer}
                    </p>
                  )}
                  {c.expectedSources.length > 0 && (
                    <p className="text-muted-foreground font-mono text-xs">
                      Sources: {c.expectedSources.join(", ")}
                    </p>
                  )}
                </div>
                <form action={deleteCase.bind(null, c.id)}>
                  <button
                    type="submit"
                    className="text-xs text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        <AddCaseForm datasetId={datasetId} />
      </section>

      <section className="glass space-y-3 rounded-2xl p-6">
        <h2 className="font-semibold">Run evaluation</h2>
        <p className="text-muted-foreground text-sm">
          Runs the real chat graph against every case above, then judges each
          turn with a real LLM call — this spends real tokens (see
          /admin/ai/usage) and can take a while for larger datasets.
        </p>
        {cases.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Add at least one case first.
          </p>
        ) : (
          <RunEvaluationButton datasetId={datasetId} />
        )}
      </section>

      <section className="glass space-y-3 rounded-2xl p-6">
        <h2 className="font-semibold">Past runs</h2>
        {runs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No runs yet.</p>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/admin/ai/evaluation/${datasetId}/runs/${run.id}`}
                className="border-border hover:border-primary flex items-center justify-between rounded-xl border px-4 py-3 text-sm"
              >
                <span>
                  {run.startedAt.toLocaleString()} — {run.model}, prompt v
                  {run.promptVersion}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[run.status] ?? ""}`}
                >
                  {run.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
