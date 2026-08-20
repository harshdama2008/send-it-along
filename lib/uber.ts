import "server-only";

// CLAUDE.md section 5, "Uber Direct". Sandbox uses the same endpoints, auth,
// and webhooks as production — the only difference is the
// `test_specifications` block on create-delivery.
const TOKEN_URL = "https://login.uber.com/oauth/v2/token";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function baseUrl(): string {
  return `https://api.uber.com/v1/customers/${requireEnv("UBER_CUSTOMER_ID")}/`;
}

export type DeliveryAddress = {
  street_address: string[];
  city: string;
  state: string;
  zip_code: string;
  country?: string;
};

export type DeliveryLocation = {
  name: string;
  phoneNumber: string;
  address: DeliveryAddress;
  latitude?: number;
  longitude?: number;
};

export type ManifestItem = {
  name: string;
  quantity: number;
  size?: "small" | "medium" | "large" | "xlarge";
};

export type UberQuote = {
  id: string;
  feeCents: number;
  currency: string;
  expiresAt: string;
};

export type UberDelivery = {
  id: string;
  status: string;
  trackingUrl: string | null;
  raw: unknown;
};

// ---------------------------------------------------------------------------
// Auth
//
// Tokens last 30 days and token requests are rate limited to 100/hour
// (CLAUDE.md section 5, "Auth") — this module-level cache is what keeps us
// well under that, at the cost of not surviving a cold start. Good enough
// for one long-lived server process; a serverless deployment that scales to
// zero would need a shared cache instead.
// ---------------------------------------------------------------------------
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    client_id: requireEnv("UBER_CLIENT_ID"),
    client_secret: requireEnv("UBER_CLIENT_SECRET"),
    grant_type: "client_credentials",
    scope: "eats.deliveries",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Uber token request failed: ${res.status} ${await res.text().catch(() => "")}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };

  // Refresh a minute early so a request already in flight never straddles
  // the real expiry.
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.accessToken;
}

async function uberFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Uber API request failed: ${res.status} ${await res.text().catch(() => "")}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Quote
//
// Quotes expire in minutes — always re-quote immediately before dispatch
// rather than reusing a stale one (CLAUDE.md section 5, "Quote").
// ---------------------------------------------------------------------------
export async function getQuote(pickup: DeliveryLocation, dropoff: DeliveryLocation): Promise<UberQuote> {
  const data = await uberFetch<{ id: string; fee: number; currency: string; expires: string }>(
    "delivery_quotes",
    {
      method: "POST",
      body: JSON.stringify({
        pickup_address: JSON.stringify(pickup.address),
        pickup_latitude: pickup.latitude,
        pickup_longitude: pickup.longitude,
        dropoff_address: JSON.stringify(dropoff.address),
        dropoff_latitude: dropoff.latitude,
        dropoff_longitude: dropoff.longitude,
      }),
    },
  );

  return { id: data.id, feeCents: data.fee, currency: data.currency, expiresAt: data.expires };
}

// Uber's manifest requires a declared value for insurance purposes on their
// side — it is never shown to the donor. CLAUDE.md's "never assign a dollar
// value to donated goods" rule is about the donor-facing receipt, not this
// internal liability field, so a flat placeholder is used rather than
// deriving one from the donation.
const PLACEHOLDER_MANIFEST_VALUE_CENTS = 2000;

export type CreateDeliveryParams = {
  quoteId?: string;
  pickup: DeliveryLocation;
  dropoff: DeliveryLocation;
  manifestItems: ManifestItem[];
  manifestTotalValueCents?: number;
};

export async function createDelivery(params: CreateDeliveryParams): Promise<UberDelivery> {
  const data = await uberFetch<{ id: string; status: string; tracking_url?: string }>("deliveries", {
    method: "POST",
    body: JSON.stringify({
      quote_id: params.quoteId,
      pickup_name: params.pickup.name,
      pickup_address: JSON.stringify(params.pickup.address),
      pickup_phone_number: params.pickup.phoneNumber,
      pickup_latitude: params.pickup.latitude,
      pickup_longitude: params.pickup.longitude,
      dropoff_name: params.dropoff.name,
      dropoff_address: JSON.stringify(params.dropoff.address),
      dropoff_phone_number: params.dropoff.phoneNumber,
      dropoff_latitude: params.dropoff.latitude,
      dropoff_longitude: params.dropoff.longitude,
      manifest_items: params.manifestItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        size: item.size ?? "medium",
      })),
      manifest_total_value: params.manifestTotalValueCents ?? PLACEHOLDER_MANIFEST_VALUE_CENTS,
      // Nobody's home for a donation pickup — default is
      // deliverable_action_meet_at_door, which tells the courier the
      // recipient must be present. There's no pickup-side equivalent in
      // Uber's Create Delivery API; deliverable_action only governs
      // dropoff behavior.
      deliverable_action: "deliverable_action_leave_at_door",
      dropoff_verification: { picture: true },
      test_specifications: {
        robo_courier_specification: { mode: "auto" },
      },
    }),
  });

  return { id: data.id, status: data.status, trackingUrl: data.tracking_url ?? null, raw: data };
}

// Fallback if a webhook is missed (CLAUDE.md section 5, "getDelivery").
export async function getDelivery(deliveryId: string): Promise<UberDelivery> {
  const data = await uberFetch<{ id: string; status: string; tracking_url?: string }>(
    `deliveries/${deliveryId}`,
  );

  return { id: data.id, status: data.status, trackingUrl: data.tracking_url ?? null, raw: data };
}
