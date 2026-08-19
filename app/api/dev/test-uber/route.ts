import { NextResponse } from "next/server";
import { createDelivery, getQuote, getToken } from "@/lib/uber";
import type { DeliveryLocation } from "@/lib/uber";

// Temporary — exercises the token → quote → createDelivery pipe against the
// Uber sandbox with two hardcoded real addresses, before any of this is
// wired to real donation data. Not meant to survive past Step 4.
const PICKUP: DeliveryLocation = {
  name: "Send It Along test pickup",
  phoneNumber: "+16505555555",
  address: {
    street_address: ["1 City Hall Square"],
    city: "Boston",
    state: "MA",
    zip_code: "02201",
    country: "US",
  },
};

const DROPOFF: DeliveryLocation = {
  name: "Goodwill",
  phoneNumber: "+16505555555",
  address: {
    street_address: ["1010 Harrison Avenue"],
    city: "Boston",
    state: "MA",
    zip_code: "02119",
    country: "US",
  },
};

async function runTestDelivery() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    console.log("[test-uber] fetching token…");
    await getToken();
    console.log("[test-uber] got token");

    console.log("[test-uber] requesting quote…");
    const quote = await getQuote(PICKUP, DROPOFF);
    console.log("[test-uber] quote:", quote);

    console.log("[test-uber] creating delivery…");
    const delivery = await createDelivery({
      quoteId: quote.id,
      pickup: PICKUP,
      dropoff: DROPOFF,
      manifestItems: [{ name: "Donated goods", quantity: 1, size: "medium" }],
    });
    console.log("[test-uber] delivery id:", delivery.id, "status:", delivery.status);

    return NextResponse.json({ quote, delivery });
  } catch (error) {
    console.error("[test-uber] failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Uber test run failed" },
      { status: 502 },
    );
  }
}

// GET so it can be triggered by visiting the URL directly in a browser.
export const GET = runTestDelivery;
export const POST = runTestDelivery;
