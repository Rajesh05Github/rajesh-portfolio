import type { Certification } from "@/lib/db/schema";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

export function CertificationsSection({ items }: { items: Certification[] }) {
  if (items.length === 0) return null;

  return (
    <section
      id="certifications"
      className="section-py relative overflow-hidden"
    >
      <div className="decorative-glow bg-primary/5 absolute top-1/2 right-1/4 h-96 w-96 -translate-y-1/2 rounded-full blur-3xl" />

      <div className="container-themed relative z-10">
        <div className="mb-16 max-w-3xl">
          <span className="text-secondary-foreground animate-fade-in text-sm font-medium tracking-wider uppercase">
            Certifications
          </span>
          <h2 className="text-secondary-foreground animate-fade-in animation-delay-100 mt-4 mb-6 text-4xl font-bold md:text-5xl">
            Credentials that{" "}
            <span className="text-foreground font-serif italic">
              back it up.
            </span>
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="glass animate-fade-in rounded-2xl p-6"
            >
              <h3 className="text-xl font-semibold">{item.name}</h3>
              <p className="text-muted-foreground">{item.issuer}</p>
              <p className="text-primary mt-4 text-sm font-medium">
                Issued {formatDate(item.issueDate)}
                {item.expiryDate && ` · Expires ${formatDate(item.expiryDate)}`}
              </p>
              {item.credentialUrl && (
                <a
                  href={item.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary mt-4 inline-block text-sm font-medium hover:underline"
                >
                  View credential →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
