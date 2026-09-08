import { RagTestForm } from "@/components/admin/rag-test-form";

export default function RagTestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">RAG Test</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Runs the real retrieval → rerank → context-builder pipeline against a
          typed-in query — useful for checking why the chatbot (Phase 13) would
          or wouldn&apos;t find something, before there&apos;s a chat UI to ask
          it directly.
        </p>
      </div>
      <RagTestForm />
    </div>
  );
}
