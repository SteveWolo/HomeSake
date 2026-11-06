import { useEffect } from "react";

import { useSiteContent } from "@/hooks/use-site-content";

function setMeta(attr: "name" | "property", key: string, content: string) {
  if (!content) return;
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * Applies the global SEO fields and custom analytics snippets saved in the
 * Site editor. Runs on the client so admins can change them without a rebuild.
 */
export function SeoInjector() {
  const { seo } = useSiteContent();

  useEffect(() => {
    if (!seo) return;
    if (seo.metaTitle) document.title = seo.metaTitle;
    setMeta("name", "description", seo.metaDescription);
    setMeta("name", "keywords", seo.metaKeywords);
    setMeta("property", "og:title", seo.metaTitle);
    setMeta("property", "og:description", seo.metaDescription);

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
