import { useEffect } from "react";

import { useSiteContent } from "@/hooks/use-site-content";

/** Applies the custom analytics snippets saved in the Site editor. */
export function SeoInjector() {
  const { seo } = useSiteContent();

  useEffect(() => {
    if (!seo) return;
    const injected: Element[] = [];
    const mount = (html: string, target: HTMLElement, marker: string) => {
      if (!html.trim()) return;
      const holder = document.createElement("div");
      holder.innerHTML = html;
      for (const node of Array.from(holder.childNodes)) {
        if (node instanceof HTMLScriptElement) {
          const script = document.createElement("script");
          for (const a of Array.from(node.attributes)) script.setAttribute(a.name, a.value);
          script.textContent = node.textContent;
          script.dataset["cms"] = marker;
          target.appendChild(script);
          injected.push(script);
        } else if (node instanceof HTMLElement) {
          node.dataset["cms"] = marker;
          target.appendChild(node);
          injected.push(node);
        }
      }
    };

    mount(seo.headScripts ?? "", document.head, "head");
    mount(seo.bodyScripts ?? "", document.body, "body");

    return () => {
      for (const el of injected) el.remove();
    };
  }, [seo]);

  return null;
}
