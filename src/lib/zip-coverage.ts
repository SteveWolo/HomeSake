/**
 * ZIP lookup helpers so the coverage checker answers for every ZIP inside a
 * served city/metro, not only the single ZIP listed on the page.
 */

export type ZipPlace = { city: string; state: string };

const cache = new Map<string, ZipPlace | null>();

const norm = (v: string) => v.trim().toLowerCase();

/** Resolves a US ZIP to its city + state abbreviation (null when unknown). */
export async function lookupZip(zip: string): Promise<ZipPlace | null> {
  if (cache.has(zip)) return cache.get(zip) ?? null;
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) {
      cache.set(zip, null);
      return null;
    }
    const json = (await res.json()) as {
      places?: { "place name"?: string; "state abbreviation"?: string }[];
    };
    const place = json.places?.[0];
    const result: ZipPlace | null =
      place?.["place name"] && place["state abbreviation"]
        ? { city: place["place name"], state: place["state abbreviation"] }
        : null;
    cache.set(zip, result);
    return result;
  } catch {
    cache.set(zip, null);
    return null;
  }
}

/** "Palo Alto, CA" -> { city: "Palo Alto", state: "CA" } */
export function parseAreaName(name: string): ZipPlace {
  const [city = "", state = ""] = name.split(",").map((p) => p.trim());
  return { city, state };
}

export type Area = { zip: string; name: string };

/**
 * Finds the served area a ZIP belongs to. Matches on the exact listed ZIP, on
 * the labelled city/state, or on the city the listed ZIP itself sits in — so
 * neighbourhood labels (e.g. "Upper West Side, NY") still cover their whole city.
 */
export async function matchArea(zip: string, areas: Area[]): Promise<Area | null> {
  const exact = areas.find((a) => a.zip === zip);
  if (exact) return exact;

  const place = await lookupZip(zip);
  if (!place) return null;

  const sameState = areas.filter((a) => norm(parseAreaName(a.name).state) === norm(place.state));
  if (sameState.length === 0) return null;

  const byLabel = sameState.find((a) => norm(parseAreaName(a.name).city) === norm(place.city));
  if (byLabel) return byLabel;

  for (const area of sameState) {
    const areaPlace = await lookupZip(area.zip);
    if (areaPlace && norm(areaPlace.city) === norm(place.city)) return area;
  }
  return null;
}
