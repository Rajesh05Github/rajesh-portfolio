"use client";

import { useState, type FormEvent } from "react";
import { Loader2, CheckCircle2, Send } from "lucide-react";

type Status = "idle" | "submitting" | "success" | "error";

const fieldClassName =
  "border-border bg-surface/50 focus:border-primary w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors";

/**
 * Fetch-driven (not a Server Action) so the success/error state can animate
 * in place without a full navigation — this is the "animated contact
 * section" the design asks for. Posts to /api/contact, which does real
 * validation + rate limiting + a honeypot check server-side; nothing here
 * sends an email — submissions land in the admin "Messages" inbox
 * (/admin/contact) for now, since no email-sending provider is configured.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          subject: data.get("subject") || undefined,
          message: data.get("message"),
          company: data.get("company") || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
      form.reset();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="bg-primary/15 text-primary flex h-14 w-14 items-center justify-center rounded-full">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <p className="font-semibold">Message sent.</p>
        <p className="text-muted-foreground max-w-xs text-sm">
          Thanks for reaching out — I&apos;ll get back to you soon.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="text-primary mt-2 text-sm hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot — off-screen rather than display:none, since some bots
          skip fields hidden that way; invisible and unreachable by tab for
          a real visitor either way. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="contact-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            required
            maxLength={200}
            className={fieldClassName}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="contact-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={320}
            className={fieldClassName}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="contact-subject" className="text-sm font-medium">
          Subject
        </label>
        <input
          id="contact-subject"
          name="subject"
          maxLength={200}
          className={fieldClassName}
          placeholder="What's this about?"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="contact-message" className="text-sm font-medium">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          maxLength={5000}
          rows={5}
          className={`${fieldClassName} resize-none`}
          placeholder="Tell me about your project or opportunity..."
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn-primary inline-flex w-full items-center justify-center gap-2 text-sm hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send message
          </>
        )}
      </button>
    </form>
  );
}
