import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteFooter } from "@/components/home/site-footer";
import { useSiteContent } from "@/hooks/use-site-content";

export const Route = createFileRoute("/terms")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://yourhomesake.com/terms" }],
    meta: [
      { title: "Homesake Membership Terms" },
      {
        name: "description",
        content:
          "Homesake membership terms: services scope, visual non-invasive checks, maintenance limits, emergency exclusions, recurring billing, cancellation and liability.",
      },
      { property: "og:title", content: "Homesake Membership Terms" },
      {
        property: "og:description",
        content:
          "The service scope, billing, cancellation and liability terms of the Homesake home-management membership.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { terms, header } = useSiteContent();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6 lg:px-10">
          <Link to="/" className="inline-flex" aria-label={header.logoAlt}>
            <img src={header.logo} alt={header.logoAlt} className="h-9 w-auto" />
          </Link>
          <Link
            to="/"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-20">
        <p className="eyebrow">{terms.eyebrow}</p>
        <h1 className="font-display mt-3 text-4xl leading-tight lg:text-5xl">{terms.title}</h1>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted-foreground lg:text-base">
          {terms.intro}
        </p>

        <div className="mt-12 space-y-10">
          {terms.sections.map((s, i) => (
            <section key={`${s.heading}-${i}`} className="border-t border-border pt-8">
              <h2 className="font-display text-2xl text-foreground">
                <span className="mr-3 text-base text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.heading}
              </h2>
              <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {s.body}
              </p>
            </section>
          ))}
        </div>

        {terms.closingNote && (
          <p className="mt-14 rounded-sm border border-primary/30 bg-primary/5 p-6 text-sm leading-relaxed text-muted-foreground">
            {terms.closingNote}
          </p>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
