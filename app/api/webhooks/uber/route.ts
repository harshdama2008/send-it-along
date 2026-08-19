import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/types";

// Uber signs the raw request bytes (CLAUDE.md section 5, "Webhooks") — the
// body MUST be read as text before anything parses it as JSON, or the
// signature this route will eventually verify can never match. No
// signature check or status-machine handling yet; this just proves events
// arrive and persists them for inspection.
export async function POST(request: Request) {
  const rawBody = await request.text();
  console.log("[/api/webhooks/uber]", rawBody);

  let payload: { delivery_id?: string; status?: string; kind?: string; created?: string } | null = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[/api/webhooks/uber] body was not valid JSON, skipping save");
  }

  if (payload?.delivery_id && payload.status && payload.created) {
    const row: TablesInsert<"webhook_events"> = {
      // No unique event id is provided — build one from delivery_id +
      // status + created, per CLAUDE.md.
      event_id: `${payload.delivery_id}:${payload.status}:${payload.created}`,
      delivery_id: payload.delivery_id,
      event_type: payload.kind ?? "unknown",
      payload,
      received_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("webhook_events")
      .upsert(row, { onConflict: "event_id", ignoreDuplicates: true });

    if (error) console.error("[/api/webhooks/uber] failed to save event:", error.message);
  }

  return NextResponse.json({ received: true });
}
