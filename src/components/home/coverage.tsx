import { useState } from "react";
import { CheckCircle2, MapPin, Search, Clock, Loader2 } from "lucide-react";

import { useSiteContent } from "@/hooks/use-site-content";
import { matchArea } from "@/lib/zip-coverage";

type Result =
  | { status: "covered" | "waitlist"; place: string }
  | { status: "none" }
  | { status: "invalid" };

export function Coverage({ showServiceAreasLink = true }: { showServiceAreasLink?: boolean }) {
  const { coverage } = useSiteContent();
  const [zip, setZip] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = zip.trim();
    if (!/^\d{5}$/.test(value)) return setResult({ status: "invalid" });

    setChecking(true);
    setResult(null);
    try {
      const covered = await matchArea(value, coverage.coveredAreas);
      if (covered) return setResult({ status: "covered", place: covered.name });
      const waiting = await matchArea(value, coverage.waitlistAreas);
      if (waiting) return setResult({ status: "waitlist", place: waiting.name });
      setResult({ status: "none" });
    } finally {
      setChecking(false);
    }
  };


  return (
    <section id="coverage" className="relative py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="panel grain relative overflow-hidden rounded-sm px-7 py-14 sm:px-14 lg:px-20 lg:py-20">
          <div className="relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow">{coverage.eyebrow}</p>
              <h2 className="font-display mt-5 text-[clamp(2rem,4vw,3.25rem)] leading-[1.05]">
                {coverage.title}
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">{coverage.body}</p>
              {showServiceAreasLink && <a href="/service-areas" className="mt-3 inline-block text-sm text-primary underline">
                See Homesake service areas
              </a>}

              <form onSubmit={check} className="mt-9 flex max-w-md gap-3">
                <div className="relative flex-1">
                  <MapPin className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    inputMode="numeric"
                    maxLength={5}
                    placeholder={coverage.placeholder}
                    aria-label="ZIP code"
                    className="h-14 w-full rounded-full border border-border bg-background/60 pr-4 pl-11 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/70"
                  />
                </div>
                <button
                  type="submit"
                  disabled={checking}
                  className="inline-flex h-14 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-70"
                >
                  {checking ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  {coverage.buttonLabel}
                </button>
              </form>


              {result && (
                <div className="mt-6 flex items-start gap-3 rounded-sm border border-border bg-background/50 p-5 text-sm">
                  {result.status === "covered" && (
                    <>
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                      <p>
                        <span className="font-semibold">{result.place} is fully served.</span>{" "}
                        <span className="text-muted-foreground">{coverage.coveredNote}</span>
                      </p>
                    </>
                  )}
                  {result.status === "waitlist" && (
                    <>
                      <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
                      <p>
                        <span className="font-semibold">
                          {result.place} launches next quarter.
                        </span>{" "}
                        <span className="text-muted-foreground">{coverage.waitlistNote}</span>
                      </p>
                    </>
                  )}
                  {result.status === "none" && (
                    <p className="text-muted-foreground">{coverage.noneNote}</p>
                  )}
                  {result.status === "invalid" && (
                    <p className="text-muted-foreground">{coverage.invalidNote}</p>
                  )}
                </div>
              )}
            </div>

            <ul className="grid grid-cols-2 gap-x-8 gap-y-5">
              {(coverage.displayAreas?.length
                ? coverage.displayAreas
                : coverage.coveredAreas.map((a) => a.name)
              )
                .filter((name) => name && name.trim() !== "")
                .slice(0, 10)
                .map((name) => (
                  <li
                    key={name}
                    className="hairline flex items-center gap-2 pt-4 text-sm text-muted-foreground"
                  >
                    <span className="size-1.5 rounded-full bg-primary" />
                    {name}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
