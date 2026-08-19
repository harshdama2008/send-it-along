import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/types";
import { createDelivery, getQuote } from "@/lib/uber";
import { dropoffLocationFor, manifestItemsFor, pickupLocationFor } from "@/lib/dispatch";

type DispatchRequestBody = {
  donationId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as DispatchRequestBody | null;
  const donationId = body?.donationId;

  if (!donationId) {
    return NextResponse.json({ error: "donationId is required" }, { status: 400 });
  }

  const { data: donation, error: fetchError } = await supabaseAdmin
    .from("donations")
    .select("pickup_address, pickup_lat, pickup_lng, categories, size, charity_name, charity_address")
    .eq("id", donationId)
    .maybeSingle();

  if (fetchError || !donation) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  if (!donation.charity_name || !donation.charity_address) {
    return NextResponse.json({ error: "Donation has no charity selected yet" }, { status: 400 });
  }

  try {
    const pickup = pickupLocationFor(donation);
    const dropoff = dropoffLocationFor({ name: donation.charity_name, address: donation.charity_address });

    // Quotes expire in minutes — always re-quote immediately before
    // dispatch rather than reusing the one from /api/quote (CLAUDE.md
    // section 5, "Quote").
    const freshQuote = await getQuote(pickup, dropoff);

    const delivery = await createDelivery({
      quoteId: freshQuote.id,
      pickup,
      dropoff,
      // dropoff_verification is always set to picture inside createDelivery.
      manifestItems: manifestItemsFor(donation.categories, donation.size),
    });

    const update: TablesUpdate<"donations"> = {
      status: "dispatched",
      dispatched_at: new Date().toISOString(),
      quote_id: freshQuote.id,
      quote_amount_cents: freshQuote.feeCents,
      uber_delivery_id: delivery.id,
      tracking_url: delivery.trackingUrl,
    };

    const { error: updateError } = await supabaseAdmin.from("donations").update(update).eq("id", donationId);
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({
      deliveryId: delivery.id,
      trackingUrl: delivery.trackingUrl,
      priceCents: freshQuote.feeCents,
    });
  } catch (error) {
    // Money-taken-but-nothing-dispatched is the highest priority failure
    // state (CLAUDE.md section 10) — record it rather than leaving the
    // donation silently stuck at "quoted".
    await supabaseAdmin
      .from("donations")
      .update({ status: "dispatch_failed", dispatch_failed_at: new Date().toISOString() })
      .eq("id", donationId);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not dispatch delivery" },
      { status: 502 },
    );
  }
}
