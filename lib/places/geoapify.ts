import "server-only";
import type { ReverseGeocode, SearchAddresses } from "@/lib/places/types";

const GEOAPIFY_AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete";
const GEOAPIFY_REVERSE_URL = "https://api.geoapify.com/v1/geocode/reverse";

type GeoapifyFeature = {
  properties: {
    formatted: string;
    lat: number;
    lon: number;
  };
};

function requireApiKey(): string {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) throw new Error("GEOAPIFY_API_KEY is not set");
  return apiKey;
}

export const searchAddresses: SearchAddresses = async (query) => {
  const url = new URL(GEOAPIFY_AUTOCOMPLETE_URL);
  url.searchParams.set("text", query);
  url.searchParams.set("filter", "countrycode:us");
  url.searchParams.set("apiKey", requireApiKey());

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geoapify autocomplete request failed: ${res.status}`);
  }

  const body = (await res.json()) as { features?: GeoapifyFeature[] };

  return (body.features ?? []).map((feature) => ({
    formattedAddress: feature.properties.formatted,
    lat: feature.properties.lat,
    lng: feature.properties.lon,
  }));
};

export const reverseGeocode: ReverseGeocode = async (lat, lng) => {
  const url = new URL(GEOAPIFY_REVERSE_URL);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("apiKey", requireApiKey());

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geoapify reverse geocode request failed: ${res.status}`);
  }

  const body = (await res.json()) as { features?: GeoapifyFeature[] };
  const feature = body.features?.[0];
  if (!feature) return null;

  return {
    formattedAddress: feature.properties.formatted,
    lat: feature.properties.lat,
    lng: feature.properties.lon,
  };
};
