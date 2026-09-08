import Link from "next/link";
import { CreateDatasetForm } from "@/components/admin/create-dataset-form";
import {
  listCasesForDataset,
  listDatasets,
  listRunsForDataset,
} from "@/features/evaluation/queries";

export default async function EvaluationDatasetsPage() {
  const datasets = await listDatasets();
  const rows = await Promise.all(
    datasets.map(async (dataset) => ({
      dataset,
      caseCount: (await listCasesForDataset(dataset.id)).length,
      runCount: (await listRunsForDataset(dataset.id)).length,
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Evaluation</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Reproducible datasets of questions run against the real chat graph,
          judged by a structured-output LLM call per case (retrieval relevance,
          answer relevance, faithfulness, answer correctness) plus a plain
          set-overlap context-recall check — not eyeballing a few manual chats.
        </p>
      </div>

      <CreateDatasetForm />

      <section className="glass space-y-3 rounded-2xl p-6">
        <h2 className="font-semibold">Datasets</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No datasets yet — create one above.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map(({ dataset, caseCount, runCount }) => (
              <Link
                key={dataset.id}
                href={`/admin/ai/evaluation/${dataset.id}`}
                className="border-border hover:border-primary flex items-center justify-between rounded-xl border px-4 py-3 text-sm"
              >
                <span className="font-medium">{dataset.name}</span>
                <span className="text-muted-foreground">
                  {caseCount} case{caseCount === 1 ? "" : "s"} · {runCount} run
                  {runCount === 1 ? "" : "s"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
