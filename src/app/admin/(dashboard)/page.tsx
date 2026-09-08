import { getDashboardStats } from "@/features/dashboard/queries";
import { getUsageSummary } from "@/features/usage/queries";
import { getAbuseSummary } from "@/features/security/queries";
import { getNewContactMessageCount } from "@/features/contact/queries";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

export default async function AdminDashboardPage() {
  const [stats, usageToday, abuse24h, newContactMessages] = await Promise.all([
    getDashboardStats(),
    getUsageSummary("today"),
    getAbuseSummary(24),
    getNewContactMessageCount(),
  ]);

  const abuseEvents24h = abuse24h.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A live snapshot of the portfolio and its AI assistant — every number
          below is a real count from the database, not a placeholder.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Content
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Published skills"
            value={stats.content.publishedSkills}
          />
          <StatCard
            label="Published projects"
            value={stats.content.publishedProjects}
          />
          <StatCard
            label="Published experience"
            value={stats.content.publishedExperience}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Visitor activity
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Chat sessions (all time)"
            value={stats.visitors.totalChatSessions}
          />
          <StatCard
            label="Chat sessions (last 7 days)"
            value={stats.visitors.chatSessionsLast7Days}
          />
          <StatCard
            label="New contact messages"
            value={newContactMessages}
            hint="Admin → Messages"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          AI usage today
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Requests" value={usageToday.totalRequests} />
          <StatCard label="Tokens" value={usageToday.totalTokens} />
          <StatCard
            label="Estimated cost"
            value={formatCost(usageToday.estimatedCostUsd)}
            hint="Admin → Usage & Cost for the full breakdown"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Security &amp; knowledge base
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Abuse events (24h)"
            value={abuseEvents24h}
            hint="Admin → Abuse Events"
          />
          <StatCard
            label="Knowledge chunks indexed"
            value={stats.knowledge.indexed}
          />
          <StatCard
            label="Knowledge indexing issues"
            value={stats.knowledge.failed}
            hint={
              stats.knowledge.pending > 0
                ? `${stats.knowledge.pending} pending re-index`
                : undefined
            }
          />
        </div>
      </section>
    </div>
  );
}
