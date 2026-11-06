import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  CalendarCheck,
  CameraOff,
  ClipboardCheck,
  Eye,
  GraduationCap,
  HeartHandshake,
  KeyRound,
  Repeat,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { useSiteContent } from "@/hooks/use-site-content";

export const Route = createFileRoute("/our-standards")({
  head: () => ({
    meta: [
      { title: "Our Standards — Homesake Home Care" },
      {
        name: "description",
        content:
          "How Homesake selects, screens, and trains the professionals who enter your home, and how every visit is cared for and documented.",
      },
      { property: "og:title", content: "Our Standards — Homesake Home Care" },
      {
        property: "og:description",
        content: "Carefully selected professionals, consistent training, respectful service, and a documented record of every visit.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StandardsPage,
});

const icons: Record<string, LucideIcon> = {
  BadgeCheck,
  CalendarCheck,
  CameraOff,
  ClipboardCheck,
  Eye,
  GraduationCap,
  HeartHandshake,
  KeyRound,
  Repeat,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wrench,
};

export default function StandardsPage() {
  const { standards } = useSiteContent();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-20">
        <section className="relative overflow-hidden border-b border-border py-20 lg:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:items-end lg:px-10">
            <div className="max-w-4xl">
              <p className="eyebrow">{standards.eyebrow}</p>
              <h1 className="font-display mt-5 text-5xl leading-[1.04] sm:text-6xl lg:text-8xl">
                {standards.title}
              </h1>
            </div>
            <div className="border-l border-primary/50 pl-6 lg:mb-2 lg:pl-8">
              <p className="text-sm leading-7 text-muted-foreground lg:text-base">{standards.intro}</p>
            </div>
          </div>
          <div className="mx-auto mt-14 max-w-7xl px-6 lg:mt-20 lg:px-10">
            <p className="font-display max-w-5xl text-2xl leading-relaxed text-foreground sm:text-3xl lg:text-4xl">
              {standards.trustStatement}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow">Our approach</p>
              <h2 className="font-display mt-4 text-4xl lg:text-5xl">{standards.processTitle}</h2>
            </div>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground lg:justify-self-end">
              {standards.processSummary}
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {standards.process.map((step, index) => {
              const Icon = icons[step.icon] ?? ClipboardCheck;
              return (
                <article
                  key={`${step.title}-${index}`}
                  className="group flex flex-col rounded-xl border border-border bg-surface/30 p-6 transition-colors hover:border-primary/40 hover:bg-surface/60 sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <Icon className="size-6 text-primary" />
                    <span className="font-display text-2xl text-primary/30">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-display mt-6 text-2xl transition-colors group-hover:text-primary">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border bg-surface/25">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
            <div className="max-w-3xl">
              <p className="eyebrow">Our people</p>
              <h2 className="font-display mt-4 text-4xl leading-tight lg:text-5xl">{standards.pillarsTitle}</h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {standards.pillars.map((pillar) => {
                const Icon = icons[pillar.icon] ?? ShieldCheck;
                return (
                  <article
                    key={pillar.title}
                    className="group rounded-xl border border-border bg-background/40 p-6 transition-colors hover:border-primary/40 sm:p-7"
                  >
                    <Icon className="size-6 text-primary" />
                    <h3 className="font-display mt-5 text-xl leading-snug transition-colors group-hover:text-primary">{pillar.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{pillar.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <article className="border-t border-border pt-10 lg:pt-12">
              <h2 className="font-display text-3xl lg:text-4xl">{standards.principleOneTitle}</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground lg:text-base">{standards.principleOneBody}</p>
            </article>
            <article className="border-t border-border pt-10 lg:pt-12">
              <h2 className="font-display text-3xl lg:text-4xl">{standards.principleTwoTitle}</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground lg:text-base">{standards.principleTwoBody}</p>
            </article>
          </div>
        </section>

        <section className="border-y border-primary/25 bg-primary/[0.07]">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
            <p className="eyebrow">{standards.promiseTitle}</p>
            <p className="font-display mt-7 max-w-6xl text-2xl leading-relaxed lg:text-3xl">
              {standards.promiseBody}
            </p>
            <div className="mt-10 flex flex-wrap items-end justify-between gap-4 border-t border-primary/30 pt-6">
              <p className="font-display text-2xl text-primary">{standards.promiseStatement}</p>
              <p className="text-sm text-muted-foreground">{standards.promiseTagline}</p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
