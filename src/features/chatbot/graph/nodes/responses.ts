import { getProfile } from "@/features/portfolio/queries";
import type { ChatGraphState } from "../state";

/**
 * Both nodes below skip the LLM entirely — obvious abuse and trivial general
 * chit-chat don't need retrieval or generation cost spent on them (master
 * prompt §90, extended here beyond just abuse). Neither reads `state` — the
 * routing conditionals already decided why we're here. `generalResponseNode`
 * still does one cheap DB read (not an LLM call) so the canned reply names
 * the actual owner instead of a fully generic "this portfolio" — a visitor
 * asking "what's your name"/"who are you" deserves a real name back, even
 * though the question itself doesn't warrant a full generation turn.
 */
const FALLBACK_GENERAL_RESPONSE =
  "I'm an AI assistant for this portfolio — I can answer questions about the site owner's experience, skills, and projects. Ask me something about their work!";

const REJECT_RESPONSE =
  "I can't help with that. I'm here to answer questions about this portfolio's owner — their experience, skills, and projects.";

export async function generalResponseNode(): Promise<Partial<ChatGraphState>> {
  const profile = await getProfile();
  const name = profile?.name?.trim();
  const answer = name
    ? `I'm the AI assistant for ${name}'s portfolio — I can answer questions about ${name}'s experience, skills, and projects. Ask me something about their work!`
    : FALLBACK_GENERAL_RESPONSE;
  return { answer, grounded: true };
}

export function rejectNode(): Partial<ChatGraphState> {
  return { answer: REJECT_RESPONSE, grounded: true };
}
