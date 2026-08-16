import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const donationId = new URL(request.url).searchParams.get("donationId");

  const [currentDonation, recentDonations, recentWebhookEvents] = await Promise.all([
    donationId
      ? supabaseAdmin.from("donations").select("*").eq("id", donationId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin
      .from("donations")
      .select("id, status, charity_name, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabaseAdmin
      .from("webhook_events")
      .select("event_type, payload, received_at")
      .order("received_at", { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    currentDonation: currentDonation.data,
    recentDonations: recentDonations.data ?? [],
    recentWebhookEvents: (recentWebhookEvents.data ?? []).map((row) => ({
      event_type: row.event_type,
      status: (row.payload as { status?: string } | null)?.status ?? null,
      received_at: row.received_at,
    })),
  });
}
