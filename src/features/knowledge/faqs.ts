import type { Faq } from "@/lib/db/schema";

/** Plain text format for the FAQ textarea — one per line, "question|answer" — same convention as About's highlights field. */
export function parseFaqs(raw: string): Faq[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [question, ...rest] = line.split("|");
      return {
        question: (question ?? "").trim(),
        answer: rest.join("|").trim(),
      };
    })
    .filter((faq) => faq.question && faq.answer);
}

export function faqsToText(faqs: Faq[]): string {
  return faqs.map((faq) => `${faq.question}|${faq.answer}`).join("\n");
}
