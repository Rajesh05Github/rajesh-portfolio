import { Download, User } from "lucide-react";
import type { Profile } from "@/lib/db/schema";

export function HeroSection({
  profile,
  hasResume,
}: {
  profile: Profile;
  hasResume: boolean;
}) {
  return (
    <section
      id="hero"
      className="section-py relative flex min-h-screen flex-col justify-center overflow-hidden"
    >
      <div className="decorative-glow bg-primary/10 absolute top-1/3 right-1/4 h-96 w-96 rounded-full blur-3xl" />
      <div className="decorative-glow bg-highlight/10 absolute bottom-1/4 left-1/4 h-72 w-72 rounded-full blur-3xl" />

      <div className="container-themed relative z-10">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[1fr_1fr] md:text-left">
          <div className="animate-fade-in relative order-first mx-auto h-96 w-72 md:order-last md:mx-0 md:h-[34rem] md:w-[26rem] md:justify-self-end">
            {/* Soft pulsing glow behind the photo, matching the two decorative-glow blobs already in this section — gated by the same [data-effects-gradients="false"] rule since it's purely decorative. */}
            <div className="decorative-glow bg-primary/30 absolute inset-0 -z-20 animate-pulse rounded-full blur-2xl" />
            {/* A slow-rotating conic-gradient ring, closer to the photo edge
                than the blurred glow above — reuses Tailwind's built-in
                `animate-spin` keyframes (same trick as the marquee rows'
                duration override) just slowed way down via inline style,
                rather than defining a new keyframe for one extra animation. */}
            <div
              className="decorative-glow absolute -inset-3 -z-10 animate-spin rounded-full opacity-70"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent, var(--color-primary), transparent 70%)",
                animationDuration: "6s",
              }}
            />
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin-supplied external URLs or our own /api/avatar; next/image domain allowlisting isn't set up for arbitrary external hosts
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                // A non-1:1 aspect ratio (portrait) with `rounded-full` renders
                // as an oval/ellipse rather than a circle — that's the whole
                // trick, no separate "oval" utility exists in CSS.
                className="border-border/50 animate-float h-96 w-72 rounded-full border object-cover shadow-2xl md:h-[34rem] md:w-[26rem]"
              />
            ) : (
              // Placeholder while no real photo is uploaded yet — shows the
              // real oval frame, size, and motion so the layout is visible
              // before a real photo exists; swaps for the real `<img>` above
              // automatically the moment one is uploaded via /admin/profile.
              <div className="bg-surface border-border/50 animate-float text-muted-foreground/40 flex h-96 w-72 items-center justify-center rounded-full border shadow-2xl md:h-[34rem] md:w-[26rem]">
                <User className="h-24 w-24" strokeWidth={1.25} />
              </div>
            )}
          </div>

          <div className="text-center md:text-left">
            {profile.availableForWork && (
              <span className="glass animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
                <span className="bg-primary relative h-2 w-2 rounded-full">
                  <span className="bg-primary absolute inset-0 animate-ping rounded-full opacity-75" />
                </span>
                Available for work
              </span>
            )}

            <h1 className="text-secondary-foreground animate-fade-in animation-delay-100 text-4xl font-bold md:text-6xl">
              {profile.headline}
            </h1>

            {profile.tagline && (
              <p className="text-muted-foreground animate-fade-in animation-delay-200 mx-auto mt-6 max-w-xl text-lg md:mx-0">
                {profile.tagline}
              </p>
            )}

            <div className="animate-fade-in animation-delay-300 mt-10 flex flex-wrap items-center justify-center gap-4 md:justify-start">
              <a
                href="#contact"
                className="btn-primary inline-block text-sm hover:opacity-90"
              >
                Contact Me
              </a>
              {hasResume && (
                <a
                  href="/api/resume"
                  className="glass border-border hover:border-primary/50 inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium"
                >
                  <Download className="h-4 w-4" />
                  Download CV
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
