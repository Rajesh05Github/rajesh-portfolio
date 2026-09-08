import {
  getAbuseSummary,
  listRecentAbuseEvents,
} from "@/features/security/queries";

const KIND_STYLES: Record<string, string> = {
  RATE_LIMIT: "bg-primary/15 text-primary",
  TOKEN_LIMIT: "bg-primary/15 text-primary",
  PROMPT_INJECTION: "bg-red-500/10 text-red-400",
  OVERSIZED_INPUT: "bg-red-500/10 text-red-400",
  OTHER: "bg-muted text-muted-foreground",
};

export default async function SecurityDashboardPage() {
  const [last24h, last7d, recentEvents] = await Promise.all([
    getAbuseSummary(24),
    getAbuseSummary(24 * 7),
    listRecentAbuseEvents(50),
  ]);

  const total24h = last24h.reduce((sum, row) => sum + row.count, 0);
  const total7d = last7d.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Security</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every rate-limit trip, token-budget rejection, and
          prompt-injection/oversized-input detection on the public chat endpoint
          writes an `AbuseEvent` row here — this is a violation log, not a live
          blocking console; the block already happened by the time a row
          appears.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4">
          <p className="text-muted-foreground text-xs">Events (24h)</p>
          <p className="text-2xl font-semibold">{total24h}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-muted-foreground text-xs">Events (7d)</p>
          <p className="text-2xl font-semibold">{total7d}</p>
        </div>
      </div>

      <section className="glass space-y-3 rounded-2xl p-6">
        <h2 className="font-semibold">By kind (last 7 days)</h2>
        {last7d.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No abuse events recorded in the last 7 days.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {last7d.map((row) => (
              <span
                key={row.kind}
                className={`rounded-full px-3 py-1 text-sm font-medium ${KIND_STYLES[row.kind] ?? KIND_STYLES.OTHER}`}
              >
                {row.kind}: {row.count}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="glass space-y-3 rounded-2xl p-6">
        <h2 className="font-semibold">Recent events</h2>
        {recentEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No abuse events recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="text-muted-foreground border-border border-b text-left">
                <tr>
                  <th className="p-2">Kind</th>
                  <th className="p-2">Detail</th>
                  <th className="p-2">Session</th>
                  <th className="p-2">IP hash</th>
                  <th className="p-2">When</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="border-border border-b last:border-0"
                  >
                    <td className="p-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLES[event.kind] ?? KIND_STYLES.OTHER}`}
                      >
                        {event.kind}
                      </span>
                    </td>
                    <td className="p-2">{event.detail ?? "—"}</td>
                    <td className="p-2 font-mono text-xs">
                      {event.sessionId?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="p-2 font-mono text-xs">
                      {event.ipHash?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="p-2">{event.createdAt.toLocaleString()}</td>
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
