"use client";

import { useState } from "react";
import { Copy, Check, X } from "lucide-react";

type Status = "idle" | "copied" | "failed";

/** Legacy fallback for browsers/contexts where the async Clipboard API is unavailable or denied (older browsers, some locked-down embeds/sandboxes) — a temporary offscreen textarea + the old execCommand still works almost everywhere. */
function copyWithFallback(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  let succeeded = false;
  try {
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  }
  document.body.removeChild(textarea);
  return succeeded;
}

/** A fallback for visitors with no mail client registered — the mailto link next to this still works fine for anyone who does have one, this just gives everyone else a way to actually get the address. */
export function CopyEmailButton({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleCopy() {
    let succeeded = false;
    try {
      await navigator.clipboard.writeText(email);
      succeeded = true;
    } catch {
      succeeded = copyWithFallback(email);
    }
    setStatus(succeeded ? "copied" : "failed");
    setTimeout(() => setStatus("idle"), 2000);
  }

  const label =
    status === "copied"
      ? "Email copied"
      : status === "failed"
        ? "Couldn't copy — select and copy the address manually"
        : "Copy email address";

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={label}
      className="text-muted-foreground hover:text-primary hover:bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors"
    >
      {status === "copied" ? (
        <Check className="text-primary h-4 w-4" />
      ) : status === "failed" ? (
        <X className="h-4 w-4 text-red-400" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}
