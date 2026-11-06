import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Check, ChevronDown, Minus, Wrench, XCircle } from "lucide-react";

import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { useSiteContent } from "@/hooks/use-site-content";

export const Route = createFileRoute("/membership-benefits")({
  head: () => ({
    meta: [
      { title: "Membership Benefits — The Homesake 350-Point Home Care System" },
      {
        name: "description",
        content:
          "Compare Homesake memberships and see all 350 checkpoints: what we check, what we maintain, what we document, and when each service happens.",
      },
      {
        property: "og:title",
        content: "Membership Benefits — The Homesake 350-Point Home Care System",
      },
      {
        property: "og:description",
        content:
          "A full breakdown of every Homesake membership: comparison chart, all 350 checkpoints, the yearly schedule, and what falls outside our scope.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MembershipBenefitsPage,
});

/** Renders a chart cell: tick, dash, or the literal text from the CMS. */
function ChartCell({ value }: { value: string }) {
  const v = value.trim();
  if (v === "" || v === "-" || v === "—") {
    return <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Not included" />;
  }
  if (v.toLowerCase() === "yes" || v === "✓") {
    return <Check className="mx-auto size-4 text-primary" aria-label="Included" />;
  }
  return <span className="block text-center text-sm text-foreground/90">{v}</span>;
}

function MembershipBenefitsPage() {
  const { benefits } = useSiteContent();
  const [openModule, setOpenModule] = useState<string | null>(
    benefits.modules[0]?.id ?? null,
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-20">
        {/* Comparison chart sits at the very top of the page. */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="max-w-3xl">
              <p className="text-xs tracking-[0.3em] text-primary uppercase">{benefits.eyebrow}</p>
              <h1 className="mt-5 font-display text-[clamp(2.1rem,4.6vw,3.5rem)] leading-[1.05]">
                {benefits.title}
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{benefits.intro}</p>
            </div>

            <div className="mt-14">
              <h2 className="font-display text-2xl lg:text-3xl">{benefits.chartTitle}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {benefits.chartIntro}
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {benefits.plans.map((plan) => (
                  <article
                    key={plan.name}
                    className={`rounded-lg border p-6 ${
                      plan.featured
                        ? "border-primary/60 bg-surface/60"
                        : "border-border bg-surface/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-xl">{plan.name}</h3>
                      <span className="rounded-full border border-border px-3 py-1 text-[0.7rem] tracking-wider text-muted-foreground uppercase">
                        {plan.frequency}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {plan.tagline}
                    </p>
                    <ul className="mt-5 space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex gap-2.5 text-sm leading-relaxed">
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                          <span className="min-w-0 text-foreground/85">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>

              <div className="mt-10 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[46rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="p-4 text-sm font-semibold">Service</th>
                      {benefits.plans.map((plan) => (
                        <th
                          key={plan.name}
                          className="p-4 text-center text-sm font-semibold whitespace-nowrap"
                        >
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {benefits.chart.map((row) => (
                      <tr key={row.service} className="border-b border-border/60 last:border-0">
                        <td className="p-4 align-top">
                          <p className="text-sm font-medium">{row.service}</p>
                          {row.detail && (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {row.detail}
                            </p>
                          )}
                        </td>
                        <td className="p-4 align-top">
                          <ChartCell value={row.essential} />
                        </td>
                        <td className="p-4 align-top">
                          <ChartCell value={row.signature} />
                        </td>
                        <td className="p-4 align-top">
                          <ChartCell value={row.estate} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                {benefits.chartFootnote}
              </p>

              <a
                href={benefits.ctaHref}
                className="group mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:gap-3"
                style={{ boxShadow: "var(--shadow-brass)" }}
              >
                {benefits.ctaLabel}
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
              </a>
            </div>
          </div>
        </section>

        <section className="bg-surface/20 py-16 lg:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-10">
            <div>
              <h2 className="font-display text-2xl lg:text-3xl">{benefits.systemTitle}</h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                {benefits.systemBody}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface/40 p-6 lg:mt-14">
              <p className="text-sm leading-relaxed text-muted-foreground">{benefits.systemNote}</p>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <h2 className="font-display text-2xl lg:text-3xl">{benefits.modulesTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {benefits.modulesIntro}
            </p>

            <div className="mt-10 grid gap-5">
              {benefits.modules.map((mod) => {
                const open = openModule === mod.id;
                return (
                  <article
                    key={mod.id}
                    className={`overflow-hidden rounded-lg border bg-surface/25 transition-colors ${
                      open ? "border-primary/35 bg-surface/45" : "border-border"
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenModule(open ? null : mod.id)}
                      className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-surface/40 sm:p-6"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg break-words sm:text-xl">{mod.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {mod.summary}
                        </p>
                        <p className="mt-2 text-xs tracking-[0.18em] text-primary uppercase">
                          {mod.schedule} · {mod.items.length} checkpoints
                        </p>
                      </div>
                      <ChevronDown
                        className={`mt-1 size-5 shrink-0 text-muted-foreground transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                    {open && (
                      <ol className="grid gap-x-8 gap-y-2 px-5 pb-6 sm:grid-cols-2 sm:px-6">
                        {mod.items.map((item, i) => (
                          <li
                            key={`${mod.id}-${i}`}
                            className="flex gap-3 text-sm leading-relaxed text-foreground/85"
                          >
                            <span className="w-7 shrink-0 text-right text-xs text-primary/70 tabular-nums">
                              {i + 1}.
                            </span>
                            <span className="min-w-0">{item}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-surface/20 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
            <h2 className="font-display text-2xl lg:text-3xl">{benefits.scheduleTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {benefits.scheduleIntro}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.schedule.map((row) => (
                <article
                  key={row.service}
                  className="rounded-lg border border-border bg-surface/30 p-5"
                >
                  <h3 className="text-sm font-semibold break-words">{row.service}</h3>
                  <p className="mt-2 text-xs tracking-[0.16em] text-primary uppercase">
                    {row.cadence}
                  </p>
                  {row.note && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{row.note}</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
            <h2 className="font-display text-2xl lg:text-3xl">{benefits.quickCareTitle}</h2>
            <p className="mt-5 max-w-3xl rounded-lg border border-primary/25 bg-surface/50 p-5 text-sm leading-relaxed text-foreground/90">
              {benefits.quickCareRule}
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface/30 p-6">
                <div className="flex items-center gap-2.5">
                  <Wrench className="size-5 text-primary" aria-hidden />
                  <h3 className="font-display text-lg">{benefits.quickCareIncludedTitle}</h3>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {benefits.quickCareIncluded.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0 text-foreground/85">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-surface/30 p-6">
                <div className="flex items-center gap-2.5">
                  <ArrowUpRight className="size-5 text-primary" aria-hidden />
                  <h3 className="font-display text-lg">{benefits.quickCareReferredTitle}</h3>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {benefits.quickCareReferred.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                      <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 text-foreground/85">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface/20 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
            <h2 className="font-display text-2xl lg:text-3xl">{benefits.exclusionsTitle}</h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              {benefits.exclusionsIntro}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.exclusions.map((item) => (
                <article
                  key={item.title}
                  className="rounded-lg border border-border bg-surface/30 p-5"
                >
                  <div className="flex items-start gap-2.5">
                    <XCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <h3 className="text-sm font-semibold break-words">{item.title}</h3>
                  </div>
                  {item.body && (
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
            <h2 className="font-display text-3xl lg:text-4xl">{benefits.closingTitle}</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              {benefits.closingBody}
            </p>
            <a
              href={benefits.ctaHref}
              className="group mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:gap-3"
              style={{ boxShadow: "var(--shadow-brass)" }}
            >
              {benefits.ctaLabel}
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
