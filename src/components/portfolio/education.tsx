import type { Education } from "@/lib/db/schema";

function formatPeriod(startDate: Date, endDate: Date | null): string {
  const format = (date: Date) =>
    date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  return `${format(startDate)} — ${endDate ? format(endDate) : "Present"}`;
}

export function EducationSection({ items }: { items: Education[] }) {
  if (items.length === 0) return null;

  return (
    <section id="education" className="section-py relative overflow-hidden">
      <div className="decorative-glow bg-primary/5 absolute top-1/2 right-1/4 h-96 w-96 -translate-y-1/2 rounded-full blur-3xl" />

      <div className="container-themed relative z-10">
        <div className="mb-16 max-w-3xl">
          <span className="text-secondary-foreground animate-fade-in text-sm font-medium tracking-wider uppercase">
            Academic Background
          </span>
          <h2 className="text-secondary-foreground animate-fade-in animation-delay-100 mt-4 mb-6 text-4xl font-bold md:text-5xl">
            Education that{" "}
            <span className="text-foreground font-serif italic">
              built the foundation.
            </span>
          </h2>
        </div>

        <div className="space-y-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="glass animate-fade-in rounded-2xl p-6"
            >
              <span className="text-primary text-sm font-medium">
                {formatPeriod(item.startDate, item.endDate)}
              </span>
              <h3 className="mt-2 text-xl font-semibold">
                {item.degree}
                {item.field ? `, ${item.field}` : ""}
              </h3>
              <p className="text-muted-foreground">{item.institution}</p>
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
