import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

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
    meta: [
      { title: "Home Harmony Hub — Luxury Home Management Membership" },
      {
        name: "description",
        content:
          "A private membership for luxury homes: a dedicated estate manager, vetted contractors, proactive maintenance, and 24/7 emergency response.",
      },
      { property: "og:title", content: "Home Harmony Hub — Luxury Home Management Membership" },
      {
        property: "og:description",
        content:
          "One estate manager, a vetted contractor bench, and a maintenance calendar that runs before something breaks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  // Hold the page until the saved (editor) content is in hand, so visitors never
  // see the shipped fallback copy flash before the real content swaps in.
  const { isPending } = useSiteContentQuery();

  useEffect(() => {
    if (isPending || !window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }));
  }, [isPending]);

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-background" aria-busy="true">
        <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <HeroAlt />
        <HomeHealth />
        <Services />
        <Coverage />
        <Pricing />
        <Consultation />
      </main>
      <SiteFooter />
    </div>
  );
}
