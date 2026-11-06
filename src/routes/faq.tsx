import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { useSiteContent } from "@/hooks/use-site-content";

export const Route = createFileRoute("/faq")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://yourhomesake.com/faq" }],
    meta: [
      { title: "Home Maintenance Membership FAQ | Homesake" },
      {
        name: "description",
        content:
          "Find out what Homesake maintains, how often we visit, where we serve, and how vacation home checks and billing work.",
      },
      { property: "og:title", content: "Home Maintenance Membership FAQ | Homesake" },
      {
        property: "og:description",
        content: "Answers about Homesake home management, coverage, visits, repairs, and billing.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FaqPage,
});

function FaqItem({
  number,
  q,
  a,
  open,
  onToggle,
}: {
  number: string;
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-4 py-6 text-left lg:grid-cols-[3.5rem_minmax(0,1fr)_auto] lg:py-8"
      >
        <span className="pt-1 text-xs text-primary/70">{number}</span>
        <span className="max-w-3xl font-display text-xl leading-snug text-foreground transition-colors group-hover:text-primary lg:text-2xl">{q}</span>
        <ChevronDown
          className={`mt-1 size-4 shrink-0 text-primary transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <p className="ml-[4rem] max-w-3xl pb-8 text-sm leading-7 text-muted-foreground lg:ml-[4.5rem] lg:text-base">{a}</p>
        </div>
      </div>
    </div>
  );
}

function FaqPage() {
  const { faq } = useSiteContent();
  const categories = faq.categories;
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>("0-0");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const priority = [
      "Membership & what's included",
      "Visits & home records",
      "Homesake Away & family support",
    ];
    const ordered = [
      ...priority.flatMap((title) => categories.filter((category) => category.title === title)),
      ...categories.filter((category) => !priority.includes(category.title)),
    ];
    if (!needle) return ordered;
    return ordered
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) => item.q.toLowerCase().includes(needle) || item.a.toLowerCase().includes(needle),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, query]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-20">
        <section className="relative overflow-hidden border-b border-border py-20 lg:py-32">
          <div className="pointer-events-none absolute inset-y-0 right-[8%] hidden w-px bg-border lg:block" />
          <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)] lg:items-end lg:px-10">
            <div>
              <p className="eyebrow">{faq.eyebrow}</p>
              <h1 className="font-display mt-5 max-w-4xl text-5xl leading-[1.04] sm:text-6xl lg:text-8xl">
                {faq.title}
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-muted-foreground lg:text-lg">{faq.intro}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-primary">
                <a href="/membership-benefits" className="underline">Compare maintenance plans</a>
                <a href="/service-areas" className="underline">Check service coverage</a>
              </div>
            </div>
            <label className="relative block border-b border-primary/50">
              <span className="sr-only">Search frequently asked questions</span>
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={faq.searchPlaceholder}
                className="h-16 w-full border-0 bg-transparent pr-4 pl-11 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">{faq.emptyMessage}</p>
          ) : (
            <div className="space-y-24">
              {filtered.map((category, categoryIndex) => {
                const categoryId = `faq-${categoryIndex + 1}`;
                return (
                  <section key={`${category.title}-${categoryIndex}`} id={categoryId} className="scroll-mt-28 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-20">
                    <div className="lg:sticky lg:top-28 lg:self-start">
                      <p className="font-display text-4xl text-primary/35">{String(categoryIndex + 1).padStart(2, "0")}</p>
                      <h2 className="font-display mt-5 text-3xl leading-tight">{category.title}</h2>
                      <div className="mt-7 h-px w-14 bg-primary" />
                    </div>
                    <div className="border-b border-border">
                      {category.items.map((item, itemIndex) => {
                        const key = `${categoryIndex}-${itemIndex}`;
                        return (
                          <FaqItem
                            key={key}
                            number={String(itemIndex + 1).padStart(2, "0")}
                            q={item.q}
                            a={item.a}
                            open={openKey === key}
                            onToggle={() => setOpenKey(openKey === key ? null : key)}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>

        <section className="border-y border-primary/25 bg-primary/[0.07]">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-20 lg:grid-cols-[0.7fr_1.3fr] lg:items-start lg:px-10 lg:py-28">
            <h2 className="font-display text-4xl lg:text-5xl">{faq.closingTitle}</h2>
            <p className="max-w-3xl border-l border-primary/50 pl-6 text-sm leading-7 text-muted-foreground lg:pl-8 lg:text-base">
              {faq.closingBody}
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}