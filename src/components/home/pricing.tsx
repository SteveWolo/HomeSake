import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Check } from "lucide-react";

import { useSiteContent } from "@/hooks/use-site-content";

export function Pricing() {
  const { pricing } = useSiteContent();
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow">{pricing.eyebrow}</p>
            <h2 className="font-display mt-5 text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1.02]">
              {pricing.title}
              <span className="text-brass-gradient italic"> {pricing.titleAccent}</span>
            </h2>
          </div>

          <div
            role="radiogroup"
            aria-label="Billing period"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/70 p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={!annual}
              onClick={() => setAnnual(false)}
              className={`h-10 rounded-full px-5 text-sm font-medium transition-colors ${
                !annual
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {pricing.monthlyLabel}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={annual}
              onClick={() => setAnnual(true)}
              className={`h-10 rounded-full px-5 text-sm font-medium transition-colors ${
                annual
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {pricing.annualLabel}
            </button>
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {pricing.tiers.map((t) => {
            const annualMonthly = t.annualMonthly || Math.round((t.monthly * 10) / 12);
            const price = annual ? annualMonthly : t.monthly;
            return (
              <article
                key={t.name}
                className={`relative flex flex-col rounded-sm p-9 transition-transform duration-500 hover:-translate-y-1 ${
                  t.featured
                    ? "panel border-primary/40 lg:-mt-6 lg:pb-14"
                    : "border border-border bg-background"
                }`}
              >
                {t.featured && (
                  <span className="absolute -top-3 left-9 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-primary-foreground uppercase">
                    {pricing.featuredBadge}
                  </span>
                )}
                <h3 className="font-display text-2xl">{t.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.tagline}</p>

                <div className="mt-8 flex items-baseline gap-2">
                  <span className="font-display text-5xl">${price.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {annual
                    ? `${pricing.annualNote} · $${(annualMonthly * 12).toLocaleString()} per year`
                    : pricing.monthlyNote}
                </p>


                <ul className="mt-8 flex-1 space-y-3.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {pricing.benefitsLinkLabel && (
                  <a
                    href={pricing.benefitsLinkHref || "/membership-benefits"}
                    className="group mt-8 inline-flex items-center justify-center gap-2 text-sm font-medium text-primary transition-colors hover:text-foreground"
                  >
                    {pricing.benefitsLinkLabel}
                    <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/checkout",
                      search: { plan: t.name, period: annual ? "annual" : "monthly" },
                    })
                  }
                  className={`mt-4 inline-flex h-13 items-center justify-center rounded-full px-6 py-4 text-sm font-semibold transition-colors ${
                    t.featured
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border text-foreground hover:border-primary/60 hover:text-primary"
                  }`}
                >
                  {t.ctaLabel}
                </button>
              </article>
            );
          })}
        </div>

      </div>

    </section>
  );
}
