import type { Skill } from "@/lib/db/schema";

const ROW_COUNT = 3;
/** Row N gets a slightly longer loop than row N-1 — rows drift out of sync with each other instead of visually "resetting" together, which reads as more alive. */
const ROW_DURATIONS_SECONDS = [28, 36, 44];

export function SkillsSection({ items }: { items: Skill[] }) {
  if (items.length === 0) return null;

  // Distribute skills round-robin across rows rather than chunking them in
  // order, so a row isn't dominated by one category if the admin happened
  // to enter all of one category consecutively.
  const rows: Skill[][] = Array.from({ length: ROW_COUNT }, () => []);
  items.forEach((skill, index) => rows[index % ROW_COUNT]!.push(skill));

  return (
    <section id="skills" className="section-py relative overflow-hidden">
      <div className="decorative-glow bg-primary/10 absolute top-0 left-1/3 h-80 w-80 animate-pulse rounded-full blur-3xl" />
      <div className="decorative-glow bg-highlight/10 animation-delay-400 absolute right-1/5 bottom-0 h-64 w-64 animate-pulse rounded-full blur-3xl" />

      <div className="container-themed relative z-10">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="text-secondary-foreground animate-fade-in text-sm font-medium tracking-wider uppercase">
            Skills
          </span>
          <h2 className="text-secondary-foreground animate-fade-in animation-delay-100 mt-4 mb-6 text-4xl font-bold md:text-5xl">
            Technologies I{" "}
            <span className="text-foreground font-serif italic">
              work with.
            </span>
          </h2>
        </div>
      </div>

      <div className="animate-fade-in animation-delay-200 relative space-y-5">
        <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r to-transparent" />
        <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l to-transparent" />

        {rows.map((row, rowIndex) => {
          if (row.length === 0) return null;
          const loop = [...row, ...row];

          return (
            <div key={rowIndex} className="group overflow-hidden">
              <div
                className={`flex w-max gap-4 ${
                  rowIndex % 2 === 1
                    ? "animate-marquee-reverse"
                    : "animate-marquee"
                } group-hover:[animation-play-state:paused]`}
                style={{
                  animationDuration: `${ROW_DURATIONS_SECONDS[rowIndex % ROW_DURATIONS_SECONDS.length]}s`,
                }}
              >
                {loop.map((skill, index) => (
                  <span
                    key={`${skill.id}-${index}`}
                    className="glass border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary shrink-0 rounded-full border px-6 py-3 text-sm font-medium whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
