import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/lib/supabase/types";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Rounded to 2dp (~1km) per CLAUDE.md section 4, "Charities — Overpass API".
export function cacheKeyFor(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export async function readCache(cacheKey: string): Promise<Tables<"charities_cache">[] | null> {
  const { data, error } = await supabaseAdmin.from("charities_cache").select("*").eq("cache_key", cacheKey);

  if (error || !data || data.length === 0) return null;

  const cutoff = Date.now() - CACHE_TTL_MS;
  const isFresh = data.every((row) => new Date(row.fetched_at).getTime() >= cutoff);
  return isFresh ? data : null;
}

export async function writeCache(rows: TablesInsert<"charities_cache">[]): Promise<void> {
  if (rows.length === 0) return;
  await supabaseAdmin.from("charities_cache").upsert(rows, { onConflict: "place_id" });
}
