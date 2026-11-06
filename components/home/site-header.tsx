import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogIn, Menu, X } from "lucide-react";

import logoUrl from "@/assets/homesake-logo.png";
import { useSiteContent } from "@/hooks/use-site-content";
import { resolveSiteHref } from "@/lib/site-links";

export function SiteHeader() {
  const { header } = useSiteContent();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isInternal = header.loginHref.startsWith("/");

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link
          to={header.logoHref || "/"}
          className="flex shrink-0 items-center"
          aria-label="Homesake — home"
        >
          <img
            src={header.logo}
            alt={header.logoAlt}
            onError={(event) => {
              if (event.currentTarget.src !== logoUrl) event.currentTarget.src = logoUrl;
            }}
            className="h-9 w-auto md:h-11"
          />
        </Link>

        <nav className="hidden items-center gap-4 overflow-x-auto md:flex lg:gap-8">
          {header.navLinks.map((l) => (
            <a
              key={`${l.label}-${l.href}`}
              href={resolveSiteHref(l.href, pathname)}
              className="relative whitespace-nowrap text-xs text-muted-foreground transition-colors hover:text-foreground lg:text-sm"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden shrink-0 md:block">
          {isInternal ? (
            <Link
              to={header.loginHref}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform duration-300 hover:scale-[1.03] lg:h-11 lg:px-6 lg:text-sm"
            >
              <LogIn className="size-4" />
              <span className="hidden lg:inline">{header.loginLabel}</span>
              <span className="lg:hidden">Login</span>
            </Link>
          ) : (
            <a
              href={header.loginHref}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform duration-300 hover:scale-[1.03] lg:h-11 lg:px-6 lg:text-sm"
            >
              <LogIn className="size-4" />
              <span className="hidden lg:inline">{header.loginLabel}</span>
              <span className="lg:hidden">Login</span>
            </a>
          )}
        </div>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="grid size-10 place-items-center rounded-full border border-border md:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background/95 px-6 py-6 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-5">
            {header.navLinks.map((l) => (
              <a
                key={`${l.label}-${l.href}`}
                href={resolveSiteHref(l.href, pathname)}
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground"
              >
                {l.label}
              </a>
            ))}
            <a
              href={header.loginHref}
              onClick={() => setOpen(false)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              <LogIn className="size-4" />
              {header.loginLabel}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
