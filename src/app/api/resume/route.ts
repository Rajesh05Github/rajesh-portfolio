import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { resume } from "@/lib/db/schema";
import { storage } from "@/lib/storage";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { RESUME_DOWNLOAD_RATE_LIMIT } from "@/lib/config/limits";

/** Public, unauthenticated — the whole point of publishing a resume. Rate-limited per IP purely as abuse mitigation (docs/security.md §8), not a real usage cap. */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(
    `resume-download:${ip}`,
    RESUME_DOWNLOAD_RATE_LIMIT.perIp,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  const [active] = await db
    .select()
    .from(resume)
    .where(eq(resume.isActive, true))
    .limit(1);
  if (!active) {
    return NextResponse.json(
      { error: "No resume is currently available." },
      { status: 404 },
    );
  }

  const buffer = await storage.read(active.fileUrl).catch(() => null);
  if (!buffer) {
    return NextResponse.json(
      { error: "Resume file could not be read." },
      { status: 500 },
    );
  }

  await db
    .update(resume)
    .set({ downloadCount: sql`${resume.downloadCount} + 1` })
    .where(eq(resume.id, active.id));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${active.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
