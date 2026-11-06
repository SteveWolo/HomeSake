import { CalendarCheck, ClipboardList, HardHat, ShieldCheck, Sparkles, Wrench } from "lucide-react";

import { useSiteContent } from "@/hooks/use-site-content";

const icons = [Wrench, HardHat, ShieldCheck, ClipboardList, CalendarCheck, Sparkles];

export function Services() {
  const { services } = useSiteContent();

  return (
    <section id="services" className="relative py-28 lg:py-40">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-3xl">
          <p className="eyebrow">{services.eyebrow}</p>
          <h2 className="font-display mt-5 text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1.02]">
            {services.title}
            <span className="text-brass-gradient italic"> {services.titleAccent}</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_0.72fr] lg:gap-16">
          <ol className="flex flex-col">
            {services.steps.map((s) => (
              <li
                key={s.number + s.title}
                className="group grid grid-cols-[auto_1fr] gap-6 border-t border-border py-9 transition-colors last:border-b hover:border-primary/50"
              >
                <span className="font-display text-2xl text-primary/70 transition-colors group-hover:text-primary">
                  {s.number}
                </span>
                <div>
                  <h3 className="font-display text-2xl">{s.title}</h3>
                  <p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <figure className="relative overflow-hidden rounded-sm">
            <img
              src={services.image}
              alt={services.imageAlt}
              loading="lazy"
              width={1200}
              height={1408}
              className="size-full object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-7">
              <p className="font-display text-xl">{services.imageTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{services.imageNote}</p>
            </figcaption>
          </figure>
        </div>

        <div className="mt-24 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {services.cards.map((s, i) => {
            const Icon = icons[i % icons.length]!;
            return (
              <article
                key={s.title}
                className="group bg-background p-8 transition-colors duration-300 hover:bg-secondary"
              >
                <Icon className="size-6 text-primary transition-transform duration-300 group-hover:-translate-y-0.5" />
                <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
