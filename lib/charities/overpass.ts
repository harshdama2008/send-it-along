import "server-only";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Overpass's usage policy requires a descriptive User-Agent identifying the
// traffic source — no personal contact info needed, just what's calling.
const USER_AGENT = "SendItAlongDemo/0.1 (donation pickup demo app; charity lookup feature)";

export type RawCharity = {
  placeId: string;
  name: string;
  brand: string | null;
  address: string | null;
  lat: number;
  lng: number;
  openingHoursTag: string | null;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

// Serializes every Overpass call through this module to at most one request
// per second (CLAUDE.md section 4: "One request per second maximum"). This
// is a single in-process queue, not a distributed limiter — good enough for
// a demo running as one server, not a guarantee under horizontal scaling.
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1000;

function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return task();
  });
  queue = run.catch(() => {});
  return run;
}

function formatAddress(tags: Record<string, string>): string | null {
  const line1 = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const cityStateZip = [tags["addr:city"], [tags["addr:state"], tags["addr:postcode"]].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const parts = [line1, cityStateZip].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export async function fetchCharitiesFromOverpass(lat: number, lng: number): Promise<RawCharity[]> {
  const query = `[out:json][timeout:25];
(
  nwr["shop"="charity"](around:25000,${lat},${lng});
  nwr["shop"="second_hand"](around:25000,${lat},${lng});
);
out center tags;`;

  const res = await throttled(() =>
    fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
    }),
  );

  if (!res.ok) {
    throw new Error(`Overpass request failed: ${res.status}`);
  }

  const body = (await res.json()) as { elements?: OverpassElement[] };

  const results: RawCharity[] = [];
  for (const el of body.elements ?? []) {
    const tags = el.tags;
    if (!tags?.name) continue;

    const center = el.type === "node" ? { lat: el.lat, lon: el.lon } : el.center;
    if (typeof center?.lat !== "number" || typeof center?.lon !== "number") continue;

    results.push({
      placeId: `${el.type}/${el.id}`,
      name: tags.name,
      brand: tags.brand ?? null,
      address: formatAddress(tags),
      lat: center.lat,
      lng: center.lon,
      openingHoursTag: tags.opening_hours ?? null,
    });
  }

  return results;
}
