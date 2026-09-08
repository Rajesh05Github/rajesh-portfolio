import Link from "next/link";
import {
  getTopSessionsByTokens,
  getUsageByOperation,
  getUsageSummary,
  type UsageRange,
} from "@/features/usage/queries";

const RANGES: { value: UsageRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

export default async function UsageDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range: UsageRange = RANGES.some((r) => r.value === params.range)
    ? (params.range as UsageRange)
    : "today";

  const [summary, byOperation, topSessions] = await Promise.all([
    getUsageSummary(range),
    getUsageByOperation(range),
    getTopSessionsByTokens(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Usage & Cost</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Built from real `UsageRecord` rows — every OpenAI call (chat
          completions and embeddings) writes one. The layered request/token
          limits that protect this data are in{" "}
          <code className="text-xs">lib/config/limits.ts</code>.
        </p>
      </div>

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.value}
            href={`/admin/ai/usage?range=${r.value}`}
            className={
              r.value === range
                ? "bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-sm font-medium"
                : "border-border rounded-full border px-4 py-1.5 text-sm"
            }
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass rounded-2xl p-4">
          <p className="text-muted-foreground text-xs">Requests</p>
          <p className="text-2xl font-semibold">{summary.totalRequests}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-muted-foreground text-xs">Total tokens</p>
          <p className="text-2xl font-semibold">
            {summary.totalTokens.toLocaleString()}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-muted-foreground text-xs">Estimated cost</p>
          <p className="text-2xl font-semibold">
            {formatCost(summary.estimatedCostUsd)}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-muted-foreground text-xs">Avg latency</p>
          <p className="text-2xl font-semibold">
            {Math.round(summary.avgLatencyMs)}ms
          </p>
        </div>
      </div>

      <section className="glass space-y-3 rounded-2xl p-6">
        <h2 className="font-semibold">By operation</h2>
        {byOperation.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No usage recorded in this range yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="text-muted-foreground border-border border-b text-left">
                <tr>
                  <th className="p-2">Operation</th>
                  <th className="p-2">Requests</th>
                  <th className="p-2">Tokens</th>
                  <th className="p-2">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {byOperation.map((row) => (
                  <tr
                    key={row.operation}
                    className="border-border border-b last:border-0"
                  >
                    <td className="p-2">{row.operation}</td>
                    <td className="p-2">{row.requests}</td>
                    <td className="p-2">{row.totalTokens.toLocaleString()}</td>
                    <td className="p-2">{formatCost(row.estimatedCostUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="glass space-y-3 rounded-2xl p-6">
        <h2 className="font-semibold">
          Top sessions by token consumption (all time)
        </h2>
        {topSessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No chat sessions have used any tokens yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="text-muted-foreground border-border border-b text-left">
                <tr>
                  <th className="p-2">Session</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Messages</th>
                  <th className="p-2">Tokens</th>
                  <th className="p-2">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {topSessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-border border-b last:border-0"
                  >
                    <td className="p-2 font-mono text-xs">
                      {session.id.slice(0, 8)}
                    </td>
                    <td className="p-2">{session.status}</td>
                    <td className="p-2">{session.messageCount}</td>
                    <td className="p-2">
                      {session.totalTokens.toLocaleString()}
                    </td>
                    <td className="p-2">
                      {session.lastActivityAt.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
