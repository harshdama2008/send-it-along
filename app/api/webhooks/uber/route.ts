import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/types";

// The only statuses this handler ever writes. Pre-dispatch statuses (draft,
// quoted, paid) and the non-Uber failure branches (quote_expired,
// payment_failed, dispatch_failed) never appear here, so a donation still
// sitting in one of those has index -1 below — correctly "before" any Uber
// status.
const STATUS_ORDER = ["dispatched", "courier_assigned", "picked_up", "delivered", "cancelled"] as const;
type UberMappedStatus = (typeof STATUS_ORDER)[number];

// CLAUDE.md section 5, "Status mapping".
const UBER_STATUS_MAP: Record<string, UberMappedStatus> = {
  pending: "dispatched",
  pickup: "courier_assigned",
  pickup_complete: "picked_up",
  dropoff: "picked_up",
  delivered: "delivered",
  canceled: "cancelled",
  returned: "cancelled",
};

type StatusTimestampColumn =
  | "dispatched_at"
  | "courier_assigned_at"
  | "picked_up_at"
  | "delivered_at"
  | "cancelled_at";

const STATUS_TIMESTAMP_COLUMN: Record<UberMappedStatus, StatusTimestampColumn> = {
  dispatched: "dispatched_at",
  courier_assigned: "courier_assigned_at",
  picked_up: "picked_up_at",
  delivered: "delivered_at",
  cancelled: "cancelled_at",
};

type UberWebhookPayload = {
  delivery_id?: string;
  status?: string;
  kind?: string;
  created?: string;
  data?: {
    courier?: { name?: string } | null;
    pickup?: { courier_imminent?: boolean } | null;
    dropoff?: { courier_imminent?: boolean } | null;
  };
};

function verifySignature(rawBody: string, signatureHeader: string | null, signingKey: string): boolean {
  if (!signatureHeader) return false;

  const expected = Buffer.from(createHmac("sha256", signingKey).update(rawBody, "utf8").digest("hex"), "hex");
  const provided = Buffer.from(signatureHeader, "hex");

  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

// Lets scripts/replay-uber-webhook.mjs (and other local testing) post
// unsigned payloads straight to this route. Gated on NODE_ENV as well as
// the flag itself so a stray env var can never disable verification in a
// deployed environment.
const skipSignatureCheck =
  process.env.NODE_ENV !== "production" && process.env.UBER_WEBHOOK_SKIP_SIGNATURE_CHECK === "1";

export async function POST(request: Request) {
  // Uber signs the raw request bytes — read as text before anything parses
  // it as JSON, or the signature check below will never match a
  // re-serialized body (CLAUDE.md section 5, "Webhooks").
  const rawBody = await request.text();

  if (!skipSignatureCheck) {
    const signingKey = process.env.UBER_WEBHOOK_SIGNING_KEY;
    if (!signingKey) {
      console.error("[/api/webhooks/uber] UBER_WEBHOOK_SIGNING_KEY is not set");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    // Uber sends either header for delivery status events.
    const signatureHeader =
      request.headers.get("x-uber-signature") ?? request.headers.get("x-postmates-signature");

    if (!verifySignature(rawBody, signatureHeader, signingKey)) {
      console.error("[/api/webhooks/uber] signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: UberWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[/api/webhooks/uber] body was not valid JSON");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { delivery_id: deliveryId, status, created, kind } = payload;
  if (!deliveryId || !status || !created) {
    console.error("[/api/webhooks/uber] missing delivery_id, status, or created", payload);
    return NextResponse.json({ received: true });
  }

  // No unique event id is provided — build one from delivery_id + status +
  // created and use it as the primary key.
  const eventRow: TablesInsert<"webhook_events"> = {
    event_id: `${deliveryId}:${status}:${created}`,
    delivery_id: deliveryId,
    event_type: kind ?? "unknown",
    payload,
  };

  const { error: insertError } = await supabaseAdmin.from("webhook_events").insert(eventRow);

  if (insertError) {
    // 23505 = unique_violation on event_id — we've already processed this
    // exact event (Uber retries and delivers out of order). Nothing more to do.
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true });
    }
    console.error("[/api/webhooks/uber] failed to save event:", insertError.message);
    return NextResponse.json({ error: "Could not save event" }, { status: 500 });
  }

  const mappedStatus = UBER_STATUS_MAP[status];
  if (!mappedStatus) {
    // e.g. a courier_update event — recorded above, nothing further to apply.
    return NextResponse.json({ received: true });
  }

  const { data: donation, error: fetchError } = await supabaseAdmin
    .from("donations")
    .select("status, courier_name")
    .eq("uber_delivery_id", deliveryId)
    .maybeSingle();

  if (fetchError || !donation) {
    console.error("[/api/webhooks/uber] no donation found for delivery", deliveryId, fetchError?.message);
    return NextResponse.json({ received: true });
  }

  // Webhooks are duplicated and arrive out of order (CLAUDE.md section 5).
  // Compare positions in STATUS_ORDER rather than trusting arrival order:
  // an event strictly earlier than the donation's current status
  // (nextIndex < currentIndex) is a stale, out-of-order delivery and is
  // dropped outright — `status` itself must never go backwards. An event
  // for the SAME mapped status (nextIndex === currentIndex) is not a
  // regression, so it still updates courier_name/courier_imminent below —
  // those fields change mid-status (courier_imminent flips true on a
  // repeated `pickup` webhook well before the status advances to
  // `picked_up`) — it just skips rewriting `status`/its timestamp again.
  const currentIndex = STATUS_ORDER.indexOf(donation.status as UberMappedStatus);
  const nextIndex = STATUS_ORDER.indexOf(mappedStatus);
  if (nextIndex < currentIndex) {
    return NextResponse.json({ received: true });
  }

  const update: TablesUpdate<"donations"> = {};

  if (nextIndex > currentIndex) {
    update.status = mappedStatus;
    update[STATUS_TIMESTAMP_COLUMN[mappedStatus]] = new Date().toISOString();
  }

  // Courier name is absent from the `delivered` webhook — save it the
  // first time it shows up and leave it alone after that.
  const courierName = payload.data?.courier?.name;
  if (courierName && !donation.courier_name) {
    update.courier_name = courierName;
  }

  // ~1 minute from arrival — drives the "Almost there" copy.
  const courierImminent = payload.data?.pickup?.courier_imminent ?? payload.data?.dropoff?.courier_imminent;
  if (typeof courierImminent === "boolean") {
    update.courier_imminent = courierImminent;
  }

  if (Object.keys(update).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from("donations")
      .update(update)
      .eq("uber_delivery_id", deliveryId);

    if (updateError) {
      console.error("[/api/webhooks/uber] failed to update donation:", updateError.message);
    }
  }

  // Return 200 fast — Uber retries on 5xx/timeout after 10s, 30s, 60s,
  // 120s (up to 3 attempts), so a slow handler multiplies traffic.
  return NextResponse.json({ received: true });
}
