"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90 rounded-full px-6 py-2.5 text-sm font-medium shadow-lg disabled:opacity-50"
    >
      {pending ? (pendingLabel ?? "Saving...") : children}
    </button>
  );
}
