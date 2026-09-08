import { ChatTestForm } from "@/components/admin/chat-test-form";

export default function ChatTestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Chat Test</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Runs the real LangGraph chat pipeline — security check, intent
          classification, retrieval, tool calls, and grounding — against a
          typed-in message. There&apos;s no public chat UI yet (Phase 13), so
          this is the way to exercise the full graph end to end.
        </p>
      </div>
      <ChatTestForm />
    </div>
  );
}
