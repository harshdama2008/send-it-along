import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [donations, webhookEvents] = await Promise.all([
    supabaseAdmin.from("donations").delete().not("id", "is", null),
    supabaseAdmin.from("webhook_events").delete().not("event_id", "is", null),
  ]);

  if (donations.error || webhookEvents.error) {
    return NextResponse.json(
      { error: donations.error?.message ?? webhookEvents.error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
