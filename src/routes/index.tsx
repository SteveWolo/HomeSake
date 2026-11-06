import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { useSiteContentQuery } from "@/hooks/use-site-content";
import { SiteHeader } from "@/components/home/site-header";
import { HeroAlt } from "@/components/home/hero-alt";

import { HomeHealth } from "@/components/home/home-health";
import { Services } from "@/components/home/services";
import { Coverage } from "@/components/home/coverage";
import { Pricing } from "@/components/home/pricing";
import { Consultation } from "@/components/home/consultation";
import { SiteFooter } from "@/components/home/site-footer";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://yourhomesake.com/" }],
    meta: [
      { title: "Home Maintenance in South Elgin, IL | Homesake" },
      {
        name: "description",
        content:
          "Routine home maintenance, documented home checks, and contractor coordination in South Elgin and nearby communities.",
      },
      { property: "og:title", content: "Home Maintenance in South Elgin, IL | Homesake" },
      {
        property: "og:description",
        content:
          "Routine home maintenance, documented home checks, and contractor coordination in South Elgin and nearby communities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  // The public copy can render immediately. Wait for saved settings before
  // showing purchase options or enabling the consultation form.
  const { isPending } = useSiteContentQuery();

  useEffect(() => {
    if (isPending || !window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }));
  }, [isPending]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <HeroAlt />
        <Services />
        <HomeHealth />
        <Coverage />
        {isPending ? (
          <p className="mx-auto max-w-7xl px-6 py-8 text-sm text-muted-foreground" role="status">
            Loading membership and consultation details…
          </p>
        ) : (
          <>
            <Pricing />
            <Consultation />
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
