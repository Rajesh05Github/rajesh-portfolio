import { ArrowUpRight } from "lucide-react";
import type { ProjectWithTechnologies } from "@/features/portfolio/queries";
import { GithubIcon } from "./brand-icons";

export function ProjectsSection({
  items,
}: {
  items: ProjectWithTechnologies[];
}) {
  if (items.length === 0) return null;

  return (
    <section id="projects" className="section-py relative overflow-hidden">
      <div className="decorative-glow bg-primary/5 absolute top-1/4 right-0 h-96 w-96 rounded-full blur-3xl" />
      <div className="decorative-glow bg-highlight/5 absolute bottom-1/4 left-0 h-64 w-64 rounded-full blur-3xl" />

      <div className="container-themed relative z-10">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="text-secondary-foreground animate-fade-in text-sm font-medium tracking-wider uppercase">
            Featured Work
          </span>
          <h2 className="text-secondary-foreground animate-fade-in animation-delay-100 mt-4 mb-6 text-4xl font-bold md:text-5xl">
            Projects that{" "}
            <span className="text-foreground font-serif italic">
              make an impact.
            </span>
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="glass group animate-fade-in overflow-hidden rounded-2xl"
            >
              {item.coverImageUrl && (
                <div className="relative aspect-video overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied external URLs; next/image domain allowlisting lands with resume/asset storage in Phase 7 */}
                  <img
                    src={item.coverImageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="from-card via-card/50 absolute inset-0 bg-gradient-to-t to-transparent opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {item.liveUrl && (
                      <a
                        href={item.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass hover:bg-primary hover:text-primary-foreground rounded-full p-3 transition-all"
                      >
                        <ArrowUpRight className="h-5 w-5" />
                      </a>
                    )}
                    {item.githubUrl && (
                      <a
                        href={item.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass hover:bg-primary hover:text-primary-foreground rounded-full p-3 transition-all"
                      >
                        <GithubIcon className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4 p-6">
                <div className="flex items-start justify-between">
                  <h3 className="group-hover:text-primary text-xl font-semibold transition-colors">
                    {item.title}
                  </h3>
                  <ArrowUpRight className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
                <p className="text-muted-foreground text-sm">
                  {item.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.technologies.map((tech) => (
                    <span
                      key={tech.id}
                      className="bg-surface border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-300"
                    >
                      {tech.technology}
                    </span>
                  ))}
                </div>

                {/* Always-visible, not just the hover-only overlay on the cover
                    image above (which doesn't exist at all for a project with
                    no image, and doesn't work on touch devices) — every
                    visitor needs a real way to click through to the live
                    project or its source, not just a discoverable-on-hover one. */}
                {(item.liveUrl || item.githubUrl) && (
                  <div className="border-border/50 flex flex-wrap gap-4 border-t pt-4 text-sm font-medium">
                    {item.liveUrl && (
                      <a
                        href={item.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1.5 hover:underline"
                      >
                        Live Demo
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    )}
                    {item.githubUrl && (
                      <a
                        href={item.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
                      >
                        <GithubIcon className="h-4 w-4" />
                        Code
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
