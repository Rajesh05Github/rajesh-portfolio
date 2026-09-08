import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { contactMessage } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, isSameOriginRequest } from "@/lib/security/request";
import { hashIp } from "@/lib/security/hash-ip";
import { logger } from "@/lib/observability/logger";
import {
  CONTACT_FORM_RATE_LIMIT,
  CONTACT_MESSAGE_LIMITS,
} from "@/lib/config/limits";

const requestSchema = z.object({
  name: z.string().trim().min(1).max(CONTACT_MESSAGE_LIMITS.nameMaxLength),
  email: z.string().trim().email().max(320),
  subject: z
    .string()
    .trim()
    .max(CONTACT_MESSAGE_LIMITS.subjectMaxLength)
    .optional(),
  message: z
    .string()
    .trim()
    .min(1)
    .max(CONTACT_MESSAGE_LIMITS.messageMaxLength),
  // Honeypot — a field real visitors never see or fill in, but a generic
  // bot form-filler often does. Never returned as a validation error (a bot
  // would just learn to leave it blank); silently treated as success instead.
  company: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const ipHash = hashIp(getClientIp(request));

  const rateLimit = await checkRateLimit(
    `contact:${ipHash}`,
    CONTACT_FORM_RATE_LIMIT.perIp,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many messages sent. Please try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form for errors and try again." },
      { status: 400 },
    );
  }

  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  await db.insert(contactMessage).values({
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject || null,
    message: parsed.data.message,
    ipHash,
  });

  logger.info("contact.message_received", { service: "contact", ipHash });

  return NextResponse.json({ ok: true });
}
