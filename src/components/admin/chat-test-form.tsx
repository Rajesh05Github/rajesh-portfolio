"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { testChatGraph, type ChatTestResult } from "@/features/chatbot/actions";

export function ChatTestForm() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ChatTestResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      setResult(await testChatGraph(query));
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="glass flex gap-3 rounded-2xl p-4"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. What's the live URL for his e-commerce project?"
          className="border-border bg-surface focus:border-primary focus:ring-primary flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-1"
        />
        <button
          type="submit"
          disabled={isPending || query.trim().length === 0}
          className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "Running..." : "Send"}
        </button>
      </form>

      {result && !result.ok && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {result.error}
        </div>
      )}

      {result?.ok && (
        <div className="space-y-6">
          <section className="glass space-y-3 rounded-2xl p-6">
            <h2 className="font-semibold">Answer</h2>
            <p className="text-sm whitespace-pre-wrap">
              {result.result.answer}
            </p>
          </section>

          <section className="glass space-y-3 rounded-2xl p-6">
            <h2 className="font-semibold">Trace</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Intent</dt>
                <dd>{result.result.intent ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Grounded</dt>
                <dd>
                  {result.result.grounded === undefined
                    ? "—"
                    : result.result.grounded
                      ? "Yes"
                      : "No"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tool calls</dt>
                <dd>{result.result.toolCallCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Chunks retrieved</dt>
                <dd>{result.result.retrievedContext?.chunkIds.length ?? 0}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tokens used</dt>
                <dd>{result.result.totalTokensUsed}</dd>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-muted-foreground">Request ID</dt>
                <dd className="flex items-center gap-3 font-mono text-xs">
                  {result.result.requestId}
                  <Link
                    href={`/admin/observability?requestId=${result.result.requestId}`}
                    className="text-primary font-sans underline hover:opacity-80"
                  >
                    View trace
                  </Link>
                </dd>
              </div>
              {result.result.rejectionReason && (
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-muted-foreground">Rejection reason</dt>
                  <dd>{result.result.rejectionReason}</dd>
                </div>
              )}
            </dl>
          </section>

          {result.result.retrievedContext &&
            result.result.retrievedContext.text && (
              <section className="glass space-y-3 rounded-2xl p-6">
                <h2 className="font-semibold">Retrieved context</h2>
                <pre className="bg-surface max-h-96 overflow-auto rounded-xl p-4 text-xs whitespace-pre-wrap">
                  {result.result.retrievedContext.text}
                </pre>
              </section>
            )}
        </div>
      )}
    </div>
  );
}
