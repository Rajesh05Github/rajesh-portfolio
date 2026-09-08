import { ImageResponse } from "next/og";
import { getProfile } from "@/features/portfolio/queries";

// Without this, Next tries to statically prerender this route at build
// time (it has no dynamic segment of its own to opt it out automatically)
// and calls getProfile() against the build's placeholder DATABASE_URL,
// which doesn't resolve — breaks the build outright (verified live in CI).
// Same fix as (public)/layout.tsx's force-dynamic, needed here too since
// this file lives outside that layout's subtree.
export const dynamic = "force-dynamic";

// Replaces the old static `favicon.ico` (a generic placeholder from Phase
// 5, never revisited) with a generated one matching whatever the navbar
// shows as its brand mark — same admin-configurable "Navbar brand" field
// (Profile → brandLabel) or, failing that, the profile name's first
// letter, so the tab icon and the on-page logo are never inconsistent.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const profile = await getProfile();
  const mark =
    profile?.brandLabel?.trim() ||
    profile?.name?.trim().charAt(0).toUpperCase() ||
    "•";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#20b2a6",
        color: "#ffffff",
        fontSize: 18,
        fontWeight: 700,
        fontFamily: "sans-serif",
        borderRadius: 7,
      }}
    >
      {mark}
    </div>,
    { ...size },
  );
}
