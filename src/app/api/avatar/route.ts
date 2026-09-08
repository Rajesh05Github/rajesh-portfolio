import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";
import { storage } from "@/lib/storage";

const AVATAR_STORAGE_KEY = "avatars/profile";

/** Public, unauthenticated — the whole point of a profile photo (mirrors `/api/resume`'s reasoning). Only ever serves an admin-uploaded file, never an admin-pasted external URL (Hero renders those directly via `<img src={profile.avatarUrl}>`). */
export async function GET() {
  const [row] = await db
    .select({
      avatarUrl: profile.avatarUrl,
      avatarContentType: profile.avatarContentType,
    })
    .from(profile)
    .limit(1);

  if (!row || row.avatarUrl !== "/api/avatar" || !row.avatarContentType) {
    return NextResponse.json({ error: "No avatar uploaded." }, { status: 404 });
  }

  const buffer = await storage.read(AVATAR_STORAGE_KEY).catch(() => null);
  if (!buffer) {
    return NextResponse.json(
      { error: "Avatar file could not be read." },
      { status: 500 },
    );
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": row.avatarContentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
