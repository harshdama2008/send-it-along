import "server-only";
import type { DeliveryAddress, DeliveryLocation, ManifestItem } from "@/lib/uber";
import type { DonationCategory, DonationSize } from "@/lib/donation-store";
import { formatCategoryList } from "@/lib/donation-format";

// Shared building blocks for /api/quote and /api/dispatch — both need to
// turn a donation row + chosen charity into the pickup/dropoff/manifest
// shapes lib/uber.ts expects.

// Neither donors nor charities have a phone number anywhere in this app's
// data model (no accounts, no login, no charity contact intake) — Uber
// Direct requires one on both legs regardless. The Robo Courier sandbox
// never actually calls it, so a placeholder covers both until/unless the
// app collects real numbers.
const PLACEHOLDER_PHONE_NUMBER = "+16505555555";

const MANIFEST_SIZE: Record<DonationSize, ManifestItem["size"]> = {
  "bag-or-two": "small",
  "few-bags": "medium",
  carload: "large",
};

// Our stored addresses are single formatted strings — "124 Harrison Ave,
// Boston, MA 02111" from Overpass, or the same with a trailing ", United
// States" from Geoapify — but Uber wants street/city/state/zip broken out.
// Assumes a US address, which is the only kind this app ever geocodes.
export function parseFormattedAddress(formatted: string): DeliveryAddress {
  const [street = "", city = "", stateZip = ""] = formatted
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const match = stateZip.match(/^(.*?)\s*(\d{5}(?:-\d{4})?)?$/);

  return {
    street_address: [street],
    city,
    state: match?.[1]?.trim() ?? stateZip,
    zip_code: match?.[2] ?? "",
    country: "US",
  };
}

export function pickupLocationFor(donation: {
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
}): DeliveryLocation {
  if (!donation.pickup_address) throw new Error("Donation has no pickup address");

  return {
    name: "Send It Along pickup",
    phoneNumber: PLACEHOLDER_PHONE_NUMBER,
    address: parseFormattedAddress(donation.pickup_address),
    latitude: donation.pickup_lat ?? undefined,
    longitude: donation.pickup_lng ?? undefined,
  };
}

export function dropoffLocationFor(charity: { name: string; address: string }): DeliveryLocation {
  return {
    name: charity.name,
    phoneNumber: PLACEHOLDER_PHONE_NUMBER,
    address: parseFormattedAddress(charity.address),
  };
}

// One line item for the whole pile — CLAUDE.md keeps itemised inventories
// explicitly out of scope, so this isn't a per-category breakdown.
export function manifestItemsFor(categories: string[], size: string | null): ManifestItem[] {
  return [
    {
      name: formatCategoryList(categories as DonationCategory[]) || "Donated goods",
      quantity: 1,
      size: size ? MANIFEST_SIZE[size as DonationSize] : undefined,
    },
  ];
}
