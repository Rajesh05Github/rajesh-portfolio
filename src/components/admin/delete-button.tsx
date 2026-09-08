"use client";

// A native `confirm()` is enough here — this is an internal single-admin
// tool, not a public UX surface that warrants a custom modal (docs/database
// design keeps soft-deletes recoverable anyway, so the blast radius of a
// mis-click is low).
export function DeleteButton({
  action,
  label = "Delete",
}: {
  action: (formData: FormData) => void;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("Are you sure? This can be restored later if needed.")) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm text-red-400 hover:underline">
        {label}
      </button>
    </form>
  );
}
