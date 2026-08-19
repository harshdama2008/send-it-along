import { NextResponse } from "next/server";
import type { TablesInsert, Tables } from "@/lib/supabase/types";
import type { DonationCategory } from "@/lib/donation-store";
import { fetchCharitiesFromOverpass } from "@/lib/charities/overpass";
import { acceptedCategoriesFor, organisationNameFor, fallbackHoursFor } from "@/lib/charities/chains";
import { evaluateHours, parseStoredHours, type StoredHours } from "@/lib/charities/hours";
import { haversineMiles } from "@/lib/charities/distance";
import { cacheKeyFor, readCache, writeCache } from "@/lib/charities/cache";

type CharitiesRequestBody = {
  lat?: number;
  lng?: number;
  categories?: string[];
};

type CharityResult = {
  placeId: string;
  name: string;
  address: string;
  distanceMiles: number;
  isOpen: boolean;
  hoursAreApproximate: boolean;
  hoursText: string;
};

// The subset of a charities_cache row this route actually needs — shared
// shape between a fresh cache read (Tables<"charities_cache">, a superset)
// and a just-built insert batch (TablesInsert<"charities_cache">, since
// every field below is always set explicitly before it's used here).
type CandidateCharity = {
  place_id: string;
  name: string;
  organisation?: string | null;
  formatted_address?: string | null;
  lat: number;
  lng: number;
  regular_opening_hours?: Tables<"charities_cache">["regular_opening_hours"];
  accepted_categories?: string[];
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CharitiesRequestBody | null;

  const lat = body?.lat;
  const lng = body?.lng;
  const categories = Array.isArray(body?.categories) ? (body.categories as DonationCategory[]) : [];

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const cacheKey = cacheKeyFor(lat, lng);

  try {
    let candidates: CandidateCharity[] | null = await readCache(cacheKey);

    if (!candidates) {
      const rawCharities = await fetchCharitiesFromOverpass(lat, lng);
      const fetchedAt = new Date().toISOString();

      const rows: TablesInsert<"charities_cache">[] = rawCharities.map((raw) => {
        const hours: StoredHours = raw.openingHoursTag
          ? { source: "osm", value: raw.openingHoursTag }
          : { source: "fallback", value: fallbackHoursFor(raw.name, raw.brand) };

        return {
          place_id: raw.placeId,
          name: raw.name,
          organisation: organisationNameFor(raw.name, raw.brand),
          formatted_address: raw.address,
          lat: raw.lat,
          lng: raw.lng,
          regular_opening_hours: hours,
          accepted_categories: acceptedCategoriesFor(raw.name, raw.brand),
          cache_key: cacheKey,
          fetched_at: fetchedAt,
        };
      });

      await writeCache(rows);
      candidates = rows;
    }

    const matching = candidates.filter((candidate) =>
      (candidate.accepted_categories ?? []).some((category) => categories.includes(category as DonationCategory)),
    );

    const now = new Date();
    const evaluated = matching.map((candidate) => {
      const hours = evaluateHours(parseStoredHours(candidate.regular_opening_hours), now);
      return {
        organisationKey: (candidate.organisation ?? candidate.name).toLowerCase(),
        distanceMiles: Math.round(haversineMiles(lat, lng, candidate.lat, candidate.lng) * 10) / 10,
        result: {
          placeId: candidate.place_id,
          name: candidate.name,
          address: candidate.formatted_address ?? "",
          isOpen: hours.isOpen,
          hoursAreApproximate: hours.hoursAreApproximate,
          hoursText: hours.hoursText,
        },
      };
    });

    // Open first, then nearest first (CLAUDE.md "Matching algorithm" step 3).
    evaluated.sort((a, b) => {
      if (a.result.isOpen !== b.result.isOpen) return a.result.isOpen ? -1 : 1;
      return a.distanceMiles - b.distanceMiles;
    });

    // Dedupe by organisation name so three Goodwills never show up together.
    const seen = new Set<string>();
    const deduped: CharityResult[] = [];
    for (const item of evaluated) {
      if (seen.has(item.organisationKey)) continue;
      seen.add(item.organisationKey);
      deduped.push({ ...item.result, distanceMiles: item.distanceMiles });
    }

    return NextResponse.json({ charities: deduped.slice(0, 3) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fetch nearby charities" },
      { status: 502 },
    );
  }
}
