import { useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";

import { HeroVideoModal } from "@/components/home/hero-video-modal";
import { useSiteContent } from "@/hooks/use-site-content";

export function HeroAlt() {
  const { hero } = useSiteContent();
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <section
      id="top"
      aria-labelledby="hero-alt-title"
      className="relative isolate flex min-h-[86vh] items-center overflow-hidden lg:min-h-[92vh]"
    >
      <img
        src={hero.image}
        alt={hero.imageAlt}
        width={1920}
        height={1080}
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 -z-20 size-full object-cover object-center"
      />
      {/* Very light full-bleed veil — keeps the home visible */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: "color-mix(in oklab, var(--color-background) 12%, transparent)",
        }}
        aria-hidden
      />
      {/* Left-weighted scrim only behind the copy, so text contrast stays high */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in oklab, var(--color-background) 78%, transparent) 0%, color-mix(in oklab, var(--color-background) 52%, transparent) 34%, color-mix(in oklab, var(--color-background) 14%, transparent) 60%, transparent 100%)",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 -z-10 h-40"
        style={{
          background: "linear-gradient(to top, var(--color-background), transparent)",
        }}
        aria-hidden
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col justify-center px-6 pt-[calc(6rem+50px)] pb-14 lg:px-10 lg:pt-[calc(6rem+50px)] lg:pb-12">
        <div className="max-w-2xl">
          <h1
            id="hero-alt-title"
            className="font-display text-[clamp(2.5rem,5.6vw,4.75rem)] leading-[0.98] [text-shadow:0_2px_24px_color-mix(in_oklab,var(--color-background)_70%,transparent)]"
          >
            {hero.title}
            <br />
            <span className="text-brass-gradient italic">{hero.titleAccent}</span>
            <br />
            {hero.titleEnd}
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-foreground/85 [text-shadow:0_1px_16px_color-mix(in_oklab,var(--color-background)_75%,transparent)]">
            {hero.subtitle}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href={hero.primaryCta.href}
              className="group inline-flex h-14 items-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:gap-3"
              style={{ boxShadow: "var(--shadow-brass)" }}
            >
              {hero.primaryCta.label}
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
            </a>
            <a href="#coverage" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-foreground underline">Check your ZIP</a>
            {hero.video?.buttonLabel && hero.video?.src && (
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                className="group inline-flex h-14 items-center gap-3 rounded-full px-3 pr-6 text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                <span className="relative grid size-11 place-items-center rounded-full border border-primary/50 bg-background/90 text-primary transition-transform duration-300 group-hover:scale-105">
                  <span className="absolute inset-0 animate-ping rounded-full border border-primary/40" aria-hidden />
                  <Play className="size-4 translate-x-px fill-current" />
                </span>
                <span className="[text-shadow:0_1px_14px_color-mix(in_oklab,var(--color-background)_80%,transparent)]">
                  {hero.video.buttonLabel}
                </span>
              </button>
            )}
          </div>

          {hero.trustHighlight && (
            <div className="mt-12 inline-flex items-center gap-4">

              <div className="flex items-center">
                {hero.avatars.map((src, i) => (
                  <img
                    key={`${src}-${i}`}
                    src={src}
                    alt=""
                    width={512}
                    height={512}
                    loading="lazy"
                    className={`size-11 rounded-full object-cover ring-2 ring-background/70 ${
                      i > 0 ? "-ml-3" : ""
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-foreground/90 [text-shadow:0_1px_14px_color-mix(in_oklab,var(--color-background)_80%,transparent)]">
                {hero.trustPrefix}{" "}
                <span className="font-semibold text-foreground">{hero.trustHighlight}</span>{" "}
                {hero.trustSuffix}
              </p>
            </div>
          )}
        </div>
      </div>

      <HeroVideoModal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        src={hero.video?.src ?? ""}
        srcWebm={hero.video?.srcWebm}
        poster={hero.video?.poster}
        title={hero.video?.title ?? ""}
        description={hero.video?.description ?? ""}
      />
    </section>
  );
}
