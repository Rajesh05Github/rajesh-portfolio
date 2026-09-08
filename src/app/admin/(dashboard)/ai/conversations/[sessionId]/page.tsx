import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getChatSessionDetail } from "@/features/chatbot/admin-queries";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-primary/15 text-primary",
  ENDED: "bg-muted text-muted-foreground",
  RATE_LIMITED: "bg-yellow-500/10 text-yellow-400",
  BLOCKED: "bg-red-500/10 text-red-400",
};

export default async function ChatConversationDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { session, messages } = await getChatSessionDetail(sessionId);

  if (!session) notFound();

  return (
    // `h-full` + `flex-col` here, instead of the page just flowing normally
    // in `<main>`, is what lets the transcript box below be the *only*
    // scrolling region — this root fills `<main>`'s exact height (itself
    // bounded by the viewport, see the dashboard layout), so `<main>` never
    // needs to scroll itself; only `flex-1 min-h-0 overflow-y-auto` below does.
    <div className="flex h-full max-w-3xl flex-col space-y-6">
      <Link
        href="/admin/ai/conversations"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to conversations
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {session.visitorName ?? session.visitorEmail ?? "Anonymous"}
          </h1>
          {session.visitorEmail && session.visitorName && (
            <p className="text-muted-foreground text-sm">
              {session.visitorEmail}
            </p>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[session.status] ?? STATUS_STYLES.ACTIVE}`}
        >
          {session.status}
        </span>
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span>{session.messageCount} messages</span>
        <span>{session.totalTokens} tokens</span>
        <span>Started {session.createdAt.toLocaleString()}</span>
        <span>Last activity {session.lastActivityAt.toLocaleString()}</span>
      </div>

      {/* `flex-1` fills whatever space is left after the header/meta above;
          `min-h-0` is required for a flex child to actually shrink and
          scroll instead of overflowing its parent (flex items default to
          min-height:auto) — without it this box would just keep growing and
          push `<main>` itself into scrolling, defeating the point. */}
      <div className="glass min-h-0 flex-1 space-y-4 overflow-y-auto rounded-2xl p-6">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No messages in this session.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "VISITOR"
                ? "flex justify-end"
                : "flex justify-start"
            }
          >
            <div
              className={
                message.role === "VISITOR"
                  ? "bg-primary text-primary-foreground max-w-[80%] rounded-2xl px-4 py-2 text-sm"
                  : "bg-surface max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap"
              }
            >
              {message.content}
              {(message.intent || message.requestId) && (
                <p className="mt-1 flex items-center gap-2 text-xs opacity-60">
                  {message.intent}
                  {message.requestId && (
                    <Link
                      href={`/admin/observability?requestId=${message.requestId}`}
                      className="underline hover:opacity-80"
                    >
                      View trace
                    </Link>
                  )}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
