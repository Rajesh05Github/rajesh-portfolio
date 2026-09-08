import Link from "next/link";
import { listRecentChatSessions } from "@/features/chatbot/admin-queries";
import { CHAT_RETENTION_DAYS } from "@/lib/config/limits";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-primary/15 text-primary",
  ENDED: "bg-muted text-muted-foreground",
  RATE_LIMITED: "bg-yellow-500/10 text-yellow-400",
  BLOCKED: "bg-red-500/10 text-red-400",
};

export default async function ChatConversationsPage() {
  const sessions = await listRecentChatSessions(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conversations</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every visitor chat session against the public AI assistant
          (src/components/chat/chat-widget.tsx). Sessions with no activity for{" "}
          {CHAT_RETENTION_DAYS} days are purged automatically by the retention
          job (src/features/chatbot/retention.ts) — this list only ever shows
          what&apos;s still within that window.
        </p>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-border border-b text-left">
            <tr>
              <th className="p-4">Visitor</th>
              <th className="p-4">Status</th>
              <th className="p-4">Messages</th>
              <th className="p-4">Tokens</th>
              <th className="p-4">Last activity</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.id}
                className="border-border border-b last:border-0"
              >
                <td className="p-4 font-medium">
                  {session.visitorName ?? session.visitorEmail ?? "Anonymous"}
                </td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[session.status] ?? STATUS_STYLES.ACTIVE}`}
                  >
                    {session.status}
                  </span>
                </td>
                <td className="p-4">{session.messageCount}</td>
                <td className="p-4">{session.totalTokens}</td>
                <td className="text-muted-foreground p-4">
                  {session.lastActivityAt.toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  <Link
                    href={`/admin/ai/conversations/${session.id}`}
                    className="text-primary hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground p-6 text-center"
                >
                  No conversations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
