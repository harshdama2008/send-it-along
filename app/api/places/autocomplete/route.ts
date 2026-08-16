import { NextResponse } from "next/server";
import { searchAddresses } from "@/lib/places/provider";

type AutocompleteBody = {
  query?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AutocompleteBody | null;
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!query) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await searchAddresses(query);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fetch address suggestions" },
      { status: 502 },
    );
  }
}
