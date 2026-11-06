import { useQuery } from "@tanstack/react-query";

import { defaultSiteContent, fetchSiteContent, type SiteContent } from "@/lib/site-content";

export const siteContentQueryKey = ["site-content"] as const;

const options = {
  queryKey: siteContentQueryKey,
  queryFn: fetchSiteContent,
  staleTime: 60_000,
} as const;

/** Raw query, so a page can hold rendering until the saved content has arrived. */
export function useSiteContentQuery() {
  return useQuery(options);
}

/** Live landing-page content, with the shipped defaults as last-resort fallback. */
export function useSiteContent(): SiteContent {
  const { data } = useQuery(options);
  return data ?? defaultSiteContent;
}
