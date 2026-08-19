import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/types";
import { getQuote } from "@/lib/uber";
import { dropoffLocationFor, pickupLocationFor } from "@/lib/dispatch";

type QuoteRequestBody = {
  donationId?: string;
  charity?: {
    placeId?: string;
    name?: string;
    address?: string;
  };
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as QuoteRequestBody | null;

  const donationId = body?.donationId;
  const charity = body?.charity;

  if (!donationId || !charity?.placeId || !charity.name || !charity.address) {
    return NextResponse.json({ error: "donationId and a full charity are required" }, { status: 400 });
  }

  const { data: donation, error: fetchError } = await supabaseAdmin
    .from("donations")
    .select("pickup_address, pickup_lat, pickup_lng")
    .eq("id", donationId)
    .maybeSingle();

  if (fetchError || !donation) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  try {
    const pickup = pickupLocationFor(donation);
    const dropoff = dropoffLocationFor(charity as { name: string; address: string });

    const quote = await getQuote(pickup, dropoff);

    const update: TablesUpdate<"donations"> = {
      status: "quoted",
      quoted_at: new Date().toISOString(),
      charity_place_id: charity.placeId,
      charity_name: charity.name,
      charity_address: charity.address,
      quote_id: quote.id,
      quote_amount_cents: quote.feeCents,
    };

    const { error: updateError } = await supabaseAdmin.from("donations").update(update).eq("id", donationId);
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ priceCents: quote.feeCents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not get a quote" },
      { status: 502 },
    );
  }
}
