import type { KnowledgeDocument } from "@/lib/db/schema";
import { faqsToText } from "@/features/knowledge/faqs";
import { updateKnowledgeDocument } from "@/features/knowledge/actions";
import {
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
} from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";

const INDEX_STATUS_LABELS: Record<KnowledgeDocument["indexStatus"], string> = {
  PENDING: "Pending re-index",
  INDEXING: "Indexing…",
  INDEXED: "Indexed",
  FAILED: "Indexing failed",
};

/**
 * Public content vs. AI knowledge are deliberately separate (docs/database-
 * design.md §4, master prompt §17-18) — this section lives alongside, not
 * inside, each entity's own edit form, so nothing here can accidentally
 * change what a visitor sees on the page. `additionalContext` and FAQs are
 * chatbot-only; they never render publicly.
 */
export function AiKnowledgeSection({
  document,
  redirectPath,
}: {
  document: KnowledgeDocument;
  redirectPath: string;
}) {
  const action = updateKnowledgeDocument.bind(null, document.id, redirectPath);

  return (
    <div className="glass max-w-xl space-y-6 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">AI Knowledge</h2>
        <span className="text-muted-foreground text-xs">
          {INDEX_STATUS_LABELS[document.indexStatus]}
        </span>
      </div>
      <p className="text-muted-foreground text-sm">
        Controls what the chatbot knows about this — separate from what visitors
        see on the page.
      </p>

      <form action={action} className="space-y-6">
        <CheckboxField
          name="includeInRag"
          label="Include in chatbot knowledge base"
          defaultChecked={document.includeInRag}
        />

        <SelectField
          name="visibility"
          label="Visibility"
          defaultValue={document.visibility}
          options={[
            { value: "DRAFT", label: "Draft (not retrievable yet)" },
            { value: "PUBLISHED", label: "Published (retrievable)" },
          ]}
        />

        <TextField
          name="priority"
          label="Priority (0-100, higher wins in context tie-breaks)"
          type="number"
          defaultValue={document.priority}
        />

        <TextAreaField
          name="additionalContext"
          label="Additional context (chatbot-only — never shown publicly)"
          defaultValue={document.additionalContext ?? undefined}
          rows={5}
        />

        <TextAreaField
          name="faqsText"
          label="FAQs (one per line: question|answer)"
          defaultValue={faqsToText(document.faqs)}
          rows={4}
        />

        <SubmitButton>Save AI knowledge</SubmitButton>
      </form>
    </div>
  );
}
