import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BadgeCheck,
  Eye,
  Hammer,
  HeartHandshake,
  MapPin,
  Quote,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { useSiteContent } from "@/hooks/use-site-content";

export const Route = createFileRoute("/meet-the-team")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://yourhomesake.com/meet-the-team" }],
    meta: [
      { title: "Meet Steven Woloszyk, Founder of Homesake" },
      {
        name: "description",
        content:
          "Meet Steven Woloszyk and the Homesake team providing scheduled home maintenance and home checks in the South Elgin area.",
      },
      { property: "og:title", content: "Meet Steven Woloszyk, Founder of Homesake" },
      {
        property: "og:description",
        content:
          "Meet Steven Woloszyk, a former St. Charles police officer and the founder of South Elgin-based Homesake.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MeetTheTeamPage,
});

const icons: Record<string, LucideIcon> = {
  BadgeCheck,
  Eye,
  Hammer,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Wrench,
};

function MeetTheTeamPage() {
  const { team } = useSiteContent();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-20">
        <section className="border-b border-border py-20 lg:py-28">
          <div className="mx-auto max-w-4xl px-6 text-center lg:px-10">
            <p className="text-xs tracking-[0.3em] text-primary uppercase">{team.eyebrow}</p>
            <h1 className="mt-5 font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05]">
              {team.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {team.subtitle}
            </p>
          </div>
        </section>

        <section className="border-b border-border py-16 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-16 lg:px-10">
            <figure className="overflow-hidden rounded-xl border border-border">
              <img
                src={team.founderImage}
                alt={team.founderImageAlt}
                width={1200}
                height={1500}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
            </figure>

            <div className="min-w-0">
              <h2 className="font-display text-3xl lg:text-4xl">{team.founderName}</h2>
              <p className="mt-2 text-sm tracking-[0.2em] text-primary uppercase">
                {team.founderRole}
              </p>
              <p className="mt-7 text-base leading-relaxed text-muted-foreground">
                {team.founderBio}
              </p>

              <blockquote className="relative mt-9 rounded-lg border border-primary/25 bg-surface/50 p-7">
                <Quote className="size-6 text-primary/70" aria-hidden />
                <p className="mt-4 font-display text-xl leading-snug italic">
                  {team.founderQuote}
                </p>
                <footer className="mt-4 text-sm text-muted-foreground">
                  — {team.founderName}, {team.founderRole}
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        <section className="border-b border-border py-16 lg:py-24">
          <div className="mx-auto max-w-6xl px-6 lg:px-10">
            <h2 className="font-display text-3xl lg:text-4xl">{team.valuesTitle}</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {team.values.map((value) => {
                const Icon = icons[value.icon] ?? ShieldCheck;
                return (
                  <article
                    key={value.title}
                    className="rounded-lg border border-border bg-surface/40 p-7 transition-colors hover:border-primary/40"
                  >
                    <Icon className="size-6 text-primary" aria-hidden />
                    <h3 className="mt-5 font-display text-xl">{value.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {value.body}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-surface/20 py-16 lg:py-24">
          <div className="mx-auto max-w-6xl px-6 lg:px-10">
            <div className="max-w-3xl">
              <p className="eyebrow">{team.processEyebrow}</p>
              <h2 className="mt-4 font-display text-3xl lg:text-4xl">{team.processTitle}</h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                {team.processIntro}
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {team.processStandards.map((standard) => {
                const Icon = icons[standard.icon] ?? BadgeCheck;
                return (
                  <article key={standard.title} className="border-t border-primary/40 pt-6">
                    <Icon className="size-5 text-primary" aria-hidden />
                    <h3 className="mt-4 font-display text-xl">{standard.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {standard.body}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-6xl px-6 lg:px-10">
            <div className="max-w-3xl">
              <p className="eyebrow">{team.teamEyebrow}</p>
              <h2 className="mt-4 font-display text-3xl lg:text-4xl">{team.teamTitle}</h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                {team.teamIntro}
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {team.teamMembers.map((member, index) => (
                <article
                  key={`${member.name}-${index}`}
                  className="group overflow-hidden rounded-lg border border-border bg-surface/30 transition-colors hover:border-primary/40"
                >
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.imageAlt}
                      width={800}
                      height={600}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center bg-surface/70" aria-hidden>
                      <HeartHandshake className="size-10 text-primary/70" />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-display text-xl">{member.name}</h3>
                    <p className="mt-1 text-xs tracking-[0.16em] text-primary uppercase">
                      {member.role}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {member.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-surface/20 py-16 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-center lg:px-10">
            <div>
              <p className="eyebrow">{team.coverageEyebrow}</p>
              <h2 className="mt-4 font-display text-3xl lg:text-4xl">{team.coverageTitle}</h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
                {team.coverageBody}
              </p>
              <ul className="mt-7 space-y-3">
                {team.coverageHighlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-3 text-sm text-foreground/90">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
            <blockquote className="rounded-lg border border-primary/30 bg-background/50 p-7 lg:p-8">
              <Quote className="size-6 text-primary/70" aria-hidden />
              <p className="mt-4 font-display text-xl leading-relaxed italic">
                {team.coveragePromise}
              </p>
            </blockquote>
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
            <h2 className="font-display text-3xl lg:text-4xl">{team.ctaTitle}</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">{team.ctaBody}</p>
            <a
              href={team.ctaHref}
              className="group mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:gap-3"
              style={{ boxShadow: "var(--shadow-brass)" }}
            >
              {team.ctaLabel}
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
