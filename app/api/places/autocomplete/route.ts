import { NextResponse } from "next/server";
import { reverseGeocode, searchAddresses } from "@/lib/places/provider";

type AutocompleteBody = {
  query?: string;
  lat?: number;
  lng?: number;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AutocompleteBody | null;

  try {
    // Reverse mode: given coordinates (e.g. from the browser's geolocation
    // API), look up the address at that point instead of searching by text.
    if (typeof body?.lat === "number" && typeof body?.lng === "number") {
      const suggestion = await reverseGeocode(body.lat, body.lng);
      return NextResponse.json({ suggestions: suggestion ? [suggestion] : [] });
    }

    const query = typeof body?.query === "string" ? body.query.trim() : "";
    if (!query) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await searchAddresses(query);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fetch address suggestions" },
      { status: 502 },
    );
  }
}
