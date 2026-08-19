#!/usr/bin/env node
// Dev-only synthetic webhook replayer (CLAUDE.md section 5: "Build a
// synthetic webhook replayer for the failure paths the sandbox cannot
// produce"). Takes a real payload already logged in webhook_events for a
// delivery_id, clones it, swaps in a chosen status, and posts it straight
// to /api/webhooks/uber.
//
// Usage:
//   node scripts/replay-uber-webhook.mjs                        list recent delivery ids
//   node scripts/replay-uber-webhook.mjs <deliveryId> <status>   replay one
//
// The request is sent WITHOUT a signature. Set
// UBER_WEBHOOK_SKIP_SIGNATURE_CHECK=1 in the dev server's env (see
// .env.local.example) and restart it, or the route will 401.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

function loadEnvLocal() {
  let text;
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    console.error(`Could not read ${envPath} — copy .env.local.example to .env.local first.`);
    process.exit(1);
  }

  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

const env = loadEnvLocal();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_URL = process.env.WEBHOOK_TARGET_URL ?? "http://localhost:3000/api/webhooks/uber";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

// CLAUDE.md section 5, "Status mapping" — the Uber-side statuses this app understands.
const KNOWN_STATUSES = ["pending", "pickup", "pickup_complete", "dropoff", "delivered", "canceled", "returned"];

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function listRecentEvents() {
  return supabaseGet(
    "webhook_events?select=delivery_id,payload,received_at&order=received_at.desc&limit=50",
  );
}

async function findTemplate(deliveryId) {
  const rows = await supabaseGet(
    `webhook_events?delivery_id=eq.${encodeURIComponent(deliveryId)}&select=payload&order=received_at.desc&limit=1`,
  );
  return rows[0]?.payload ?? null;
}

function printUsageAndExit(events) {
  console.log("Usage: node scripts/replay-uber-webhook.mjs <deliveryId> <status>\n");
  console.log(`Valid statuses: ${KNOWN_STATUSES.join(", ")}\n`);

  if (events.length > 0) {
    console.log("Recent delivery ids seen in webhook_events (most recent status shown):");
    const seen = new Set();
    for (const event of events) {
      if (seen.has(event.delivery_id)) continue;
      seen.add(event.delivery_id);
      console.log(`  ${event.delivery_id}  (${event.payload?.status ?? "?"}, ${event.received_at})`);
    }
  } else {
    console.log(
      "No webhook_events rows yet — trigger a real sandbox delivery first (visit /api/dev/test-uber).",
    );
  }

  process.exit(events.length > 0 ? 0 : 1);
}

function buildReplayPayload(template, status) {
  const payload = structuredClone(template);
  payload.status = status;
  payload.created = new Date().toISOString();

  // Mirror real Uber behavior this app's handler relies on: courier info
  // is absent from the `delivered` webhook.
  if (status === "delivered" && payload.data) {
    delete payload.data.courier;
  }

  // courier_imminent only makes sense mid-pickup/mid-dropoff.
  if (payload.data?.pickup) payload.data.pickup.courier_imminent = status === "pickup";
  if (payload.data?.dropoff) payload.data.dropoff.courier_imminent = status === "dropoff";

  return payload;
}

async function main() {
  const [deliveryId, status] = process.argv.slice(2);

  if (!deliveryId || !status) {
    printUsageAndExit(await listRecentEvents().catch(() => []));
    return;
  }

  if (!KNOWN_STATUSES.includes(status)) {
    console.error(`Unknown status "${status}". Valid: ${KNOWN_STATUSES.join(", ")}`);
    process.exit(1);
  }

  const template = await findTemplate(deliveryId);
  if (!template) {
    console.error(
      `No webhook_events row found for delivery_id "${deliveryId}". Run with no args to list options.`,
    );
    process.exit(1);
  }

  const payload = buildReplayPayload(template, status);
  const body = JSON.stringify(payload);

  console.log(`Replaying "${status}" for ${deliveryId} -> ${TARGET_URL}`);

  const res = await fetch(TARGET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  console.log(`-> ${res.status} ${await res.text()}`);

  if (res.status === 401) {
    console.log(
      "\n401 means the target is still verifying signatures. Set UBER_WEBHOOK_SKIP_SIGNATURE_CHECK=1 in .env.local and restart the dev server.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
