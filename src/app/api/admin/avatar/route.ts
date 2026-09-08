import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";
import { getAdminUserForApi } from "@/lib/auth/require-admin";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/auth/audit";
import { storage } from "@/lib/storage";
import { AVATAR_UPLOAD } from "@/lib/config/limits";
import { isSameOriginRequest } from "@/lib/security/request";

/** A fixed key, not a per-upload uuid (unlike `resumes/<uuid>.pdf`) — the profile is a singleton row with at most one avatar, so every upload deliberately overwrites the same file rather than accumulating orphans. */
const AVATAR_STORAGE_KEY = "avatars/profile";

/** Route Handler, not a Server Action — same reason as `/api/admin/resume`: file uploads need to bypass Next's default Server Action body-size cap. */
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
    !AVATAR_UPLOAD.allowedMimeTypes.includes(
      file.type as (typeof AVATAR_UPLOAD.allowedMimeTypes)[number],
    )
  ) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, or WebP images are accepted." },
      { status: 400 },
    );
  }
  if (file.size > AVATAR_UPLOAD.maxSizeBytes) {
    return NextResponse.json(
      { error: "File exceeds the 5MB limit." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await storage.save(AVATAR_STORAGE_KEY, buffer);

  const [current] = await db.select({ id: profile.id }).from(profile).limit(1);
  if (!current) {
    return NextResponse.json(
      { error: "Profile row not found." },
      { status: 500 },
    );
  }

  await db
    .update(profile)
    .set({ avatarUrl: "/api/avatar", avatarContentType: file.type })
    .where(eq(profile.id, current.id));

  await recordAuditLog({
    adminUserId: user.id,
    action: "profile.avatar_upload",
    targetType: "profile",
    targetId: current.id,
    metadata: { fileSizeBytes: file.size, contentType: file.type },
  });

  return NextResponse.redirect(new URL("/admin/profile", request.url), {
    status: 303,
  });
}
