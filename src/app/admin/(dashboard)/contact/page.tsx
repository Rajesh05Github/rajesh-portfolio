import { listContactMessages } from "@/features/contact/queries";
import {
  markContactMessageRead,
  archiveContactMessage,
} from "@/features/contact/actions";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-primary/15 text-primary",
  READ: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-red-500/10 text-red-400",
};

export default async function ContactMessagesPage() {
  const messages = await listContactMessages();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contact messages</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Submissions from the public site&apos;s contact form
          (src/components/portfolio/contact.tsx → /api/contact). Rate-limited
          and honeypot-filtered server-side; nothing here sends an email — check
          back or come back to this inbox for new messages.
        </p>
      </div>

      <div className="space-y-4">
        {messages.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground text-sm">No messages yet.</p>
          </div>
        )}

        {messages.map((item) => (
          <div key={item.id} className="glass space-y-3 rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{item.name}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[item.status] ?? STATUS_STYLES.NEW}`}
                  >
                    {item.status}
                  </span>
                </div>
                <a
                  href={`mailto:${item.email}`}
                  className="text-primary text-sm hover:underline"
                >
                  {item.email}
                </a>
                {item.subject && (
                  <p className="mt-1 text-sm font-medium">{item.subject}</p>
                )}
              </div>
              <div className="text-muted-foreground text-right text-xs">
                <p>{item.createdAt.toLocaleString()}</p>
                {item.ipHash && (
                  <p className="font-mono">{item.ipHash.slice(0, 8)}</p>
                )}
              </div>
            </div>

            <p className="text-muted-foreground border-border/50 border-t pt-3 text-sm whitespace-pre-wrap">
              {item.message}
            </p>

            <div className="flex gap-4 text-sm">
              {item.status !== "READ" && (
                <form action={markContactMessageRead.bind(null, item.id)}>
                  <button
                    type="submit"
                    className="text-primary hover:underline"
                  >
                    Mark as read
                  </button>
                </form>
              )}
              {item.status !== "ARCHIVED" && (
                <form action={archiveContactMessage.bind(null, item.id)}>
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Archive
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
