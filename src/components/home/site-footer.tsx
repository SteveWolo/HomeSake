import { useSiteContent } from "@/hooks/use-site-content";
import { useRouterState } from "@tanstack/react-router";
import { resolveSiteHref } from "@/lib/site-links";
import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

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
      <TextHomeSake />
    </footer>
  );
}

const businessNumber = "+18152068784";
const displayNumber = "(815) 206-8784";

function TextHomeSake() {
  const [message, setMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const draft = message.trim();
  const smsHref = `sms:${businessNumber}${draft ? `?body=${encodeURIComponent(draft)}` : ""}`;

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copied.`);
    } catch {
      setCopyStatus(`Select the ${label.toLowerCase()} above to copy it.`);
    }
  }

  return (
    <Popover onOpenChange={() => setCopyStatus("")}>
      <PopoverTrigger asChild>
        <Button className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 min-h-11 rounded-full shadow-lg">
          <MessageSquare aria-hidden="true" />
          Text HomeSake
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={10}
        aria-label="Text HomeSake"
        className="max-h-[var(--radix-popover-content-available-height)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto"
      >
        <p className="font-semibold">Questions about HomeSake?</p>
        <p className="mt-1 text-sm text-muted-foreground">Send us a text at {displayNumber}.</p>
        <label htmlFor="homesake-text-message" className="mt-4 mb-1.5 block text-sm font-medium">
          Your message
        </label>
        <Textarea
          id="homesake-text-message"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setCopyStatus("");
          }}
          placeholder="Hi! I have a question about…"
          maxLength={500}
          rows={3}
          className="resize-y"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Send from your texting app. If your draft doesn’t appear, use Copy message and paste it
          there.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <a href={smsHref}>Open texting app</a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copyText(draft || businessNumber, draft ? "Message" : "Number")}
          >
            {draft ? "Copy message" : "Copy number"}
          </Button>
        </div>
        <p role="status" className="mt-2 min-h-5 text-xs text-muted-foreground">
          {copyStatus}
        </p>
      </PopoverContent>
    </Popover>
  );
}
