import type { Experience } from "@/lib/db/schema";

function formatPeriod(startDate: Date, endDate: Date | null): string {
  const format = (date: Date) =>
    date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  return `${format(startDate)} — ${endDate ? format(endDate) : "Present"}`;
}

export function ExperienceSection({ items }: { items: Experience[] }) {
  if (items.length === 0) return null;

  return (
    <section id="experience" className="section-py relative overflow-hidden">
      <div className="decorative-glow bg-primary/5 absolute top-1/2 left-1/4 h-96 w-96 -translate-y-1/2 rounded-full blur-3xl" />

      <div className="container-themed relative z-10">
        <div className="mb-16 max-w-3xl">
          <span className="text-secondary-foreground animate-fade-in text-sm font-medium tracking-wider uppercase">
            Career Journey
          </span>
          <h2 className="text-secondary-foreground animate-fade-in animation-delay-100 mt-4 mb-6 text-4xl font-bold md:text-5xl">
            Experience that{" "}
            <span className="text-foreground font-serif italic">
              speaks volumes.
            </span>
          </h2>
        </div>

        <div className="relative">
          <div className="timeline-glow from-primary/70 via-primary/30 absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b to-transparent md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-12">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="animate-fade-in relative grid gap-8 md:grid-cols-2"
              >
                <div className="bg-primary ring-background absolute top-0 left-0 h-3 w-3 -translate-x-1/2 rounded-full ring-4 md:left-1/2">
                  {item.endDate === null && (
                    <span className="bg-primary absolute inset-0 animate-ping rounded-full opacity-75" />
                  )}
                </div>

                <div
                  className={`pl-8 md:pl-0 ${idx % 2 === 0 ? "md:pr-16 md:text-right" : "md:col-start-2 md:pl-16"}`}
                >
                  <div className="glass border-primary/30 hover:border-primary/50 rounded-2xl border p-6 transition-all duration-500">
                    <span className="text-primary text-sm font-medium">
                      {formatPeriod(item.startDate, item.endDate)}
                    </span>
                    <h3 className="mt-2 text-xl font-semibold">{item.role}</h3>
                    <p className="text-muted-foreground">{item.company}</p>
                    <p className="text-muted-foreground mt-4 text-sm">
                      {item.description}
                    </p>
                    <div
                      className={`mt-4 flex flex-wrap gap-2 ${idx % 2 === 0 ? "md:justify-end" : ""}`}
                    >
                      {item.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="bg-surface text-muted-foreground rounded-full px-3 py-1 text-xs"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
