import { NextResponse } from "next/server";

// Stub — just needs to exist and return 200 so this URL can be registered
// with Uber. Signature verification (CLAUDE.md section 5, "Webhooks") and
// idempotent status handling (section 8) come later; for now, log the raw
// body so real payload shapes can be inspected once Uber starts sending
// events.
export async function POST(request: Request) {
  const rawBody = await request.text();
  console.log("[/api/webhooks/uber]", rawBody);
  return NextResponse.json({ received: true });
}
