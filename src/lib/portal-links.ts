export type PortalSearch = {
  visit?: string;
  quote?: string;
  invoice?: string;
  issue?: string;
  property?: string;
};

const targetKeys = ["invoice", "quote", "issue", "visit", "property"] as const;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function parsePortalSearch(search: Record<string, unknown>): PortalSearch {
  for (const key of targetKeys) {
    const value = search[key];
    if (typeof value === "string" && uuid.test(value)) return { [key]: value };
  }
  return {};
}

export function portalPath(search: PortalSearch) {
  const query = new URLSearchParams(parsePortalSearch(search));
  return `/dashboard${query.size ? `?${query}` : ""}`;
}
