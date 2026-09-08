import type { About } from "@/lib/db/schema";

export function AboutSection({ about }: { about: About }) {
  const paragraphs = about.bio.split("\n\n").filter(Boolean);

  return (
    <section id="about" className="section-py relative overflow-hidden">
      <div className="decorative-glow bg-primary/5 absolute top-1/4 right-1/3 h-96 w-96 rounded-full blur-3xl" />

      <div className="container-themed relative z-10">
        <div className="mb-16 max-w-3xl">
          <span className="text-secondary-foreground animate-fade-in text-sm font-medium tracking-wider uppercase">
            Get to know me
          </span>
          <h2 className="text-secondary-foreground animate-fade-in animation-delay-100 mt-4 mb-6 text-4xl font-bold md:text-5xl">
            About{" "}
            <span className="text-foreground font-serif italic">who I am.</span>
          </h2>
        </div>

        <div className="grid gap-12 md:grid-cols-2">
          <div className="animate-fade-in space-y-4">
            {paragraphs.map((paragraph, idx) => (
              <p key={idx} className="text-muted-foreground">
                {paragraph}
              </p>
            ))}

            {about.missionQuote && (
              <div className="glass mt-6 rounded-2xl p-6">
                <p className="font-serif text-lg italic">
                  &ldquo;{about.missionQuote}&rdquo;
                </p>
              </div>
            )}
          </div>

          {about.highlights.length > 0 && (
            <div className="animate-fade-in animation-delay-100 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {about.highlights.map((highlight, idx) => (
                <div
                  key={idx}
                  className="glass border-primary/30 hover:border-primary/50 rounded-2xl border p-6 transition-all duration-500"
                >
                  <span className="text-primary text-xs font-medium tracking-wider uppercase">
                    {highlight.icon}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold">
                    {highlight.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {highlight.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
