import { CalendarDays, CheckCircle2 } from "lucide-react";

import { useSiteContent } from "@/hooks/use-site-content";

export function HomeHealth() {
  const { health } = useSiteContent();
  const circumference = 2 * Math.PI * 54;
  const score = Math.max(0, Math.min(100, Number(health.score) || 0));
  const dash = (score / 100) * circumference;

  return (
    <section aria-labelledby="home-health-title" className="relative z-10 mt-8 lg:mt-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="panel grain rounded-sm p-8 lg:p-10">
          <div className="flex flex-col gap-3 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">Sample report</p>
              <h2 id="home-health-title" className="font-display mt-3 text-3xl lg:text-4xl">
                {health.title}
              </h2>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">{health.intro}</p>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            {/* Score gauge */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative size-36 shrink-0">
                <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    strokeWidth="7"
                    className="stroke-border"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    strokeWidth="7"
                    strokeLinecap="round"
                    className="stroke-primary"
                    strokeDasharray={`${dash} ${circumference}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-4xl leading-none">{score}</span>
                  <span className="mt-1 text-[10px] tracking-[0.2em] text-primary uppercase">
                    {health.scoreBadge}
                  </span>
                </div>
              </div>
              <p className="text-sm font-semibold">{health.overallLabel}</p>
            </div>

            {/* Indicators */}
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {health.indicators.map((ind) => (
                <div
                  key={ind.label}
                  className="rounded-sm border border-border bg-background/40 px-4 py-3"
                >
                  <dt className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                    {ind.label}
                  </dt>
                  <dd className="mt-2 flex items-center gap-1.5 text-sm text-primary">
                    <CheckCircle2 className="size-3.5" />
                    {ind.status}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Next visit */}
            <div className="rounded-sm border border-primary/30 bg-background/50 p-6 lg:w-56">
              <p className="flex items-center gap-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">
                <CalendarDays className="size-3.5 text-primary" />
                {health.nextVisitLabel}
              </p>
              <p className="font-display mt-3 text-3xl leading-none">{health.nextVisitDate}</p>
              <p className="mt-2 text-xs text-muted-foreground">{health.nextVisitNote}</p>
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-semibold text-primary">See sample visit details</summary>
                <ul className="mt-2 space-y-2">
                  <li><strong>Completed</strong> · Checked the HVAC filter and tested smoke detectors.</li>
                  <li><strong>Needs attention</strong> · Loose cabinet handle. Recheck at the next visit.</li>
                </ul>
              </details>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
