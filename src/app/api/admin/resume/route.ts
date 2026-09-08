import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { resume } from "@/lib/db/schema";
import { getAdminUserForApi } from "@/lib/auth/require-admin";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { storage } from "@/lib/storage";
import { RESUME_UPLOAD } from "@/lib/config/limits";
import { isSameOriginRequest } from "@/lib/security/request";

/**
 * A Route Handler, not a Server Action, specifically because of file upload
 * size: Next.js caps Server Action request bodies at 1MB by default (an
 * `experimental.serverActions.bodySizeLimit` config knob), which a PDF
 * resume can easily exceed. Route Handlers read the raw request body with
 * no such Next-imposed cap.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const user = await getAdminUserForApi();
  if (!user || !hasPermission(user, PERMISSIONS.CONTENT_WRITE)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (
    !RESUME_UPLOAD.allowedMimeTypes.includes(
      file.type as (typeof RESUME_UPLOAD.allowedMimeTypes)[number],
    )
  ) {
    return NextResponse.json(
      { error: "Only PDF files are accepted." },
      { status: 400 },
    );
  }
  if (file.size > RESUME_UPLOAD.maxSizeBytes) {
    return NextResponse.json(
      { error: "File exceeds the 10MB limit." },
      { status: 400 },
    );
  }

  const key = `resumes/${randomUUID()}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await storage.save(key, buffer);

  const [newRow] = await db.transaction(async (tx) => {
    await tx
      .update(resume)
      .set({ isActive: false })
      .where(eq(resume.isActive, true));
    return tx
      .insert(resume)
      .values({
        fileUrl: key,
        fileName: file.name,
        fileSizeBytes: file.size,
        isActive: true,
      })
      .returning();
  });

  await recordAuditLog({
    adminUserId: user.id,
    action: "resume.upload",
    targetType: "resume",
    targetId: newRow?.id,
    metadata: { fileName: file.name, fileSizeBytes: file.size },
  });

  return NextResponse.redirect(new URL("/admin/resume", request.url), {
    status: 303,
  });
}
