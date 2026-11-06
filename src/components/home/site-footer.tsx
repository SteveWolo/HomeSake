import { useSiteContent } from "@/hooks/use-site-content";
import { useRouterState } from "@tanstack/react-router";
import { resolveSiteHref } from "@/lib/site-links";

export function SiteFooter() {
  const { footer } = useSiteContent();
  const year = String(new Date().getFullYear());
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <footer className="border-t border-border pt-20 pb-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <p className="font-display text-3xl">{footer.brand}</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {footer.blurb}
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {footer.columns.map((c) => (
              <div key={c.title}>
                <p className="text-xs tracking-[0.2em] text-primary uppercase">{c.title}</p>
                <ul className="mt-5 space-y-3">
                  {c.links.map((l) => (
                    <li key={`${l.label}-${l.href}`}>
                      <a
                        href={resolveSiteHref(l.href, pathname)}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-3 border-t border-border pt-8 text-xs text-muted-foreground sm:grid-cols-3 sm:items-center">
          <p className="sm:text-left">{footer.legalLeft.replace("{year}", year)}</p>
          <p className="sm:text-center">
            {footer.creditPrefix}{" "}
            <a
              href={footer.creditHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary transition-opacity hover:opacity-80"
            >
              {footer.creditName}
            </a>
          </p>
          <p className="sm:text-right">{footer.legalRight}</p>
        </div>

      </div>
    </footer>
  );
}
