"use client";

import { useState } from "react";

const VISITOR_TYPES = [
  { value: "RECRUITER", label: "Recruiter" },
  { value: "HR", label: "HR" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "CLIENT", label: "Client" },
  { value: "POTENTIAL_CLIENT", label: "Potential client" },
  { value: "COMPANY", label: "Company" },
  { value: "STUDENT", label: "Student" },
  { value: "OTHER", label: "Other" },
] as const;

export type VisitorGateInfo = {
  name?: string;
  email?: string;
  visitorType?: (typeof VISITOR_TYPES)[number]["value"];
  purpose?: string;
};

/**
 * Entirely optional — every field can be left blank and "Skip" starts an
 * anonymous session (the master prompt's "visitor-info gate" is a nudge for
 * better lead context, not a wall blocking access to the chatbot).
 */
export function VisitorGate({
  onSubmit,
  onSkip,
  pending,
}: {
  onSubmit: (info: VisitorGateInfo) => void;
  onSkip: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [visitorType, setVisitorType] = useState<
    VisitorGateInfo["visitorType"] | ""
  >("");
  const [purpose, setPurpose] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      visitorType: visitorType || undefined,
      purpose: purpose.trim() || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 text-sm"
    >
      <p className="text-muted-foreground">
        Mind sharing a little about yourself? Totally optional — helps tailor
        the conversation.
      </p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional)"
        className="border-border bg-surface focus:border-primary focus:ring-primary rounded-xl border px-3 py-2 outline-none focus:ring-1"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email (optional)"
        className="border-border bg-surface focus:border-primary focus:ring-primary rounded-xl border px-3 py-2 outline-none focus:ring-1"
      />
      <select
        value={visitorType}
        onChange={(e) =>
          setVisitorType(e.target.value as VisitorGateInfo["visitorType"])
        }
        className="border-border bg-surface focus:border-primary focus:ring-primary rounded-xl border px-3 py-2 outline-none focus:ring-1"
      >
        <option value="">I am a... (optional)</option>
        {VISITOR_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <textarea
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        placeholder="What brings you here? (optional)"
        rows={2}
        className="border-border bg-surface focus:border-primary focus:ring-primary resize-none rounded-xl border px-3 py-2 outline-none focus:ring-1"
      />
      <div className="mt-auto flex gap-2 pt-2">
        <button
          type="button"
          onClick={onSkip}
          disabled={pending}
          className="border-border flex-1 rounded-full border px-4 py-2 font-medium disabled:opacity-50"
        >
          Skip
        </button>
        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground flex-1 rounded-full px-4 py-2 font-medium disabled:opacity-50"
        >
          {pending ? "Starting..." : "Start chatting"}
        </button>
      </div>
    </form>
  );
}
