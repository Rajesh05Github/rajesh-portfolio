import { Sparkles } from "lucide-react";
import type { SocialLink } from "@/lib/db/schema";
import { SocialIcon } from "./social-icon";
import { ContactForm } from "./contact-form";
import { CopyEmailButton } from "./copy-email-button";

/** `emailLink.url` is a full "mailto:you@example.com?subject=..." href — strip the scheme and any query string to get the plain address for the clipboard button. */
function extractEmailAddress(mailtoUrl: string): string {
  return mailtoUrl.replace(/^mailto:/i, "").split("?")[0]!;
}

export function ContactSection({ socialLinks }: { socialLinks: SocialLink[] }) {
  const emailLink = socialLinks.find((social) => social.platform === "EMAIL");
  const otherLinks = socialLinks.filter(
    (social) => social.platform !== "EMAIL",
  );
  const hasSidebar = Boolean(emailLink) || otherLinks.length > 0;

  return (
    <section id="contact" className="section-py relative overflow-hidden">
      <div className="absolute top-0 left-0 h-full w-full">
        <div className="decorative-glow bg-primary/10 absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl" />
        <div className="decorative-glow bg-highlight/10 animation-delay-400 absolute right-1/4 bottom-1/4 h-64 w-64 animate-pulse rounded-full blur-3xl" />
      </div>

      <div className="container-themed relative z-10">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="text-secondary-foreground animate-fade-in text-sm font-medium tracking-wider uppercase">
            Get In Touch
          </span>
          <h2 className="text-secondary-foreground animate-fade-in animation-delay-100 mt-4 mb-6 text-4xl font-bold md:text-5xl">
            Let&apos;s build{" "}
            <span className="text-foreground font-serif italic">
              something great.
            </span>
          </h2>
        </div>

        <div
          className={
            hasSidebar
              ? "mx-auto grid max-w-5xl gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
              : "mx-auto max-w-2xl"
          }
        >
          {hasSidebar && (
            <div className="animate-fade-in space-y-4">
              {emailLink && (
                <div className="glow-border glass relative overflow-hidden rounded-3xl p-6">
                  <div className="decorative-glow bg-primary/20 absolute -top-10 -right-10 h-32 w-32 animate-pulse rounded-full blur-2xl" />
                  <div className="relative flex items-center gap-4">
                    <a
                      href={emailLink.url}
                      className="group flex min-w-0 flex-1 items-center gap-4"
                    >
                      <div className="bg-primary/15 group-hover:bg-primary/25 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors">
                        <SocialIcon
                          platform={emailLink.platform}
                          className="text-primary h-6 w-6"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs tracking-wide uppercase">
                          <Sparkles className="h-3.5 w-3.5" />
                          Prefer email?
                        </p>
                        <p className="group-hover:text-primary truncate font-semibold transition-colors">
                          {emailLink.label ?? "Email me directly"}
                        </p>
                      </div>
                    </a>
                    <CopyEmailButton
                      email={extractEmailAddress(emailLink.url)}
                    />
                  </div>
                </div>
              )}

              {otherLinks.length > 0 && (
                <div className="glass space-y-2 rounded-3xl p-4">
                  {otherLinks.map((social) => (
                    <a
                      key={social.id}
                      href={social.url}
                      className="hover:bg-surface group flex items-center gap-4 rounded-xl p-3 transition-colors"
                    >
                      <div className="bg-primary/10 group-hover:bg-primary/20 flex h-10 w-10 items-center justify-center rounded-xl transition-colors">
                        <SocialIcon
                          platform={social.platform}
                          className="text-primary h-4 w-4"
                        />
                      </div>
                      <div className="text-sm font-medium">
                        {social.label ?? social.platform}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="glass animate-fade-in animation-delay-200 rounded-3xl p-6 md:p-8">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
