import "server-only";
import type { AddressAutocompleteProvider } from "@/lib/places/types";

const GEOAPIFY_AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete";

type GeoapifyFeature = {
  properties: {
    formatted: string;
    lat: number;
    lon: number;
  };
};

export const searchAddresses: AddressAutocompleteProvider = async (query) => {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) throw new Error("GEOAPIFY_API_KEY is not set");

  const url = new URL(GEOAPIFY_AUTOCOMPLETE_URL);
  url.searchParams.set("text", query);
  url.searchParams.set("filter", "countrycode:us");
  url.searchParams.set("apiKey", apiKey);

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
