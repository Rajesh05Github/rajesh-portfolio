import type { Achievement } from "@/lib/db/schema";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AchievementsSection({ items }: { items: Achievement[] }) {
  if (items.length === 0) return null;

  return (
    <section id="achievements" className="section-py relative overflow-hidden">
      <div className="decorative-glow bg-primary/5 absolute top-1/2 right-1/4 h-96 w-96 -translate-y-1/2 rounded-full blur-3xl" />

      <div className="container-themed relative z-10">
        <div className="mb-16 max-w-3xl">
          <span className="text-secondary-foreground animate-fade-in text-sm font-medium tracking-wider uppercase">
            Achievements
          </span>
          <h2 className="text-secondary-foreground animate-fade-in animation-delay-100 mt-4 mb-6 text-4xl font-bold md:text-5xl">
            Milestones worth{" "}
            <span className="text-foreground font-serif italic">
              mentioning.
            </span>
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="glass rounded-2xl p-6">
              <span className="text-primary text-sm font-medium">
                {formatDate(item.date)}
              </span>
              <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
              {item.description && (
                <p className="text-muted-foreground mt-4 text-sm">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
