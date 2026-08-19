import "server-only";
import type { DonationCategory } from "@/lib/donation-store";

// The override table from CLAUDE.md section 4 ("Accepted categories") and the
// typical-hours fallback table (section 4, "Opening hours") are keyed by the
// same chain names, so they live together here instead of as two regex
// lists that could drift apart.
export type ChainDefinition = {
  organisation: string;
  match: RegExp;
  acceptedCategories: DonationCategory[];
  /** opening_hours (OSM) syntax, used when the OSM tag itself is missing. */
  fallbackHours: string;
};

export const DEFAULT_ACCEPTED_CATEGORIES: DonationCategory[] = ["clothing_shoes", "books", "bedding"];
export const DEFAULT_FALLBACK_HOURS = "Mo-Sa 10:00-18:00; Su off";

export const CHAIN_DEFINITIONS: ChainDefinition[] = [
  {
    organisation: "Goodwill",
    match: /goodwill/i,
    acceptedCategories: ["clothing_shoes", "books", "utensils", "bedding", "toys", "electronics"],
    fallbackHours: "Mo-Sa 09:00-20:00; Su 10:00-18:00",
  },
  {
    organisation: "Salvation Army",
    match: /salvation army/i,
    acceptedCategories: ["clothing_shoes", "books", "utensils", "bedding", "toys", "small_furniture"],
    fallbackHours: "Mo-Sa 09:00-19:00; Su off",
  },
  {
    organisation: "Habitat ReStore",
    match: /habitat/i,
    acceptedCategories: ["utensils", "electronics", "small_furniture"],
    fallbackHours: "Mo-Sa 09:00-18:00; Su off",
  },
  {
    organisation: "Vietnam Veterans",
    match: /vietnam veterans/i,
    acceptedCategories: ["clothing_shoes", "books", "bedding"],
    fallbackHours: DEFAULT_FALLBACK_HOURS,
  },
  {
    organisation: "Savers",
    match: /savers|value village/i,
    acceptedCategories: ["clothing_shoes", "books", "utensils", "bedding", "toys"],
    fallbackHours: "Mo-Sa 09:00-21:00; Su 10:00-19:00",
  },
];

export function matchChain(name: string, brand: string | null): ChainDefinition | null {
  const haystack = `${name} ${brand ?? ""}`;
  return CHAIN_DEFINITIONS.find((chain) => chain.match.test(haystack)) ?? null;
}

/** The name used for dedupe ("never three Goodwills") and stored as `organisation`. */
export function organisationNameFor(name: string, brand: string | null): string {
  return matchChain(name, brand)?.organisation ?? brand ?? name;
}

export function acceptedCategoriesFor(name: string, brand: string | null): DonationCategory[] {
  return matchChain(name, brand)?.acceptedCategories ?? DEFAULT_ACCEPTED_CATEGORIES;
}

export function fallbackHoursFor(name: string, brand: string | null): string {
  return matchChain(name, brand)?.fallbackHours ?? DEFAULT_FALLBACK_HOURS;
}
