import { createFileRoute } from "@tanstack/react-router";

import { Coverage } from "@/components/home/coverage";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";

const title = "Home Maintenance Service Areas | Homesake";
const description =
  "Check whether Homesake serves your address near South Elgin, Illinois. Learn how to get started with scheduled maintenance and vacation home checks.";

export const Route = createFileRoute("/service-areas")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://yourhomesake.com/service-areas" }],
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ServiceAreasPage,
});

function ServiceAreasPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-24">
        <section className="mx-auto max-w-7xl px-6 pt-14 pb-6 lg:px-10">
          <p className="eyebrow">Where we work</p>
          <h1 className="font-display mt-4 max-w-3xl text-5xl leading-tight">
            Home Maintenance in the South Elgin Area
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Homesake is based in South Elgin, Illinois. We provide scheduled home checks,
            included preventive maintenance, and a record of each visit. Check your ZIP code
            below and request a free consultation to confirm service at your address.
          </p>
        </section>
        <Coverage showServiceAreasLink={false} />
        <section className="mx-auto grid max-w-7xl gap-10 px-6 pt-4 pb-20 md:grid-cols-2 lg:px-10">
          <div>
            <h2 className="font-display text-3xl">Schedule recurring home maintenance</h2>
            <p className="mt-3 max-w-prose leading-relaxed text-muted-foreground">
              Tell us where you live and what you’d like help with. We’ll confirm coverage and
              explain which membership fits your home and how often visits are scheduled.
            </p>
            <a href="/membership-benefits" className="mt-4 inline-block text-primary underline">
              Compare home maintenance plans
            </a>
          </div>
          <div>
            <h2 className="font-display text-3xl">Ask about vacation home checks</h2>
            <p className="mt-3 max-w-prose leading-relaxed text-muted-foreground">
              If you’re traveling, ask about Homesake Away. We’ll confirm which checks are
              available for your address, what’s included, and how we report concerns.
            </p>
            <a href="/#consultation" className="mt-4 inline-block text-primary underline">
              Request a free consultation
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
