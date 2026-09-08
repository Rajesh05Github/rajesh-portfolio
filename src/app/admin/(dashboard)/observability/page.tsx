import { getRequestTrace } from "@/features/observability/queries";

export default async function ObservabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string }>;
}) {
  const { requestId } = await searchParams;
  const trace = requestId ? await getRequestTrace(requestId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Observability</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every chat turn is tagged with a `requestId`, threaded through the
          LangGraph run, its `UsageRecord` rows, and its `ChatMessage` rows.
          Paste one below to see everything that turn did and cost. Structured
          server-side logs (one JSON line per graph node, per request) carry the
          same id — this page shows what&apos;s persisted; the logs show every
          stage&apos;s timing.
        </p>
      </div>

      <form method="GET" className="glass flex gap-3 rounded-2xl p-4">
        <input
          type="text"
          name="requestId"
          defaultValue={requestId ?? ""}
          placeholder="e.g. 1ce75e03-3953-48b4-a1f3-e13f83f50cfa"
          className="border-border bg-surface focus:border-primary focus:ring-primary flex-1 rounded-xl border px-4 py-2.5 font-mono text-sm outline-none focus:ring-1"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium"
        >
          Look up
        </button>
      </form>

      {trace && trace.messages.length === 0 && trace.usage.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No `ChatMessage` or `UsageRecord` rows for this request id — either it
          never reached that far (rejected at the rate-limit/token-budget layer,
          before a request id existed) or it&apos;s simply wrong.
        </p>
      )}

      {trace && trace.messages.length > 0 && (
        <section className="glass space-y-3 rounded-2xl p-6">
          <h2 className="font-semibold">Chat messages</h2>
          <div className="space-y-2">
            {trace.messages.map((m) => (
              <div
                key={m.id}
                className="border-border rounded-xl border p-3 text-sm"
              >
                <p className="text-muted-foreground text-xs">
                  {m.role} · {m.createdAt.toLocaleString()}
                  {m.intent ? ` · intent: ${m.intent}` : ""}
                </p>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {trace && trace.usage.length > 0 && (
        <section className="glass space-y-3 rounded-2xl p-6">
          <h2 className="font-semibold">
            OpenAI calls (real, from UsageRecord)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="text-muted-foreground border-border border-b text-left">
                <tr>
                  <th className="p-2">Operation</th>
                  <th className="p-2">Model</th>
                  <th className="p-2">Tokens</th>
                  <th className="p-2">Latency</th>
                  <th className="p-2">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {trace.usage.map((row) => (
                  <tr
                    key={row.id}
                    className="border-border border-b last:border-0"
                  >
                    <td className="p-2">{row.operation}</td>
                    <td className="p-2">{row.model}</td>
                    <td className="p-2">{row.totalTokens.toLocaleString()}</td>
                    <td className="p-2">{row.latencyMs}ms</td>
                    <td className="p-2">
                      ${Number(row.estimatedCostUsd).toFixed(6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
