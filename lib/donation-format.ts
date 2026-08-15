import type { DonationCategory, DonationSize } from "@/lib/donation-store";

export const CATEGORY_LABELS: Record<DonationCategory, string> = {
  clothing: "clothing",
  books: "books",
  shoes: "shoes",
  kitchen: "kitchen",
  toys: "toys",
  linens: "linens",
  electronics: "electronics",
  "small-furniture": "small furniture",
};

export const SIZE_LABELS: Record<DonationSize, string> = {
  "bag-or-two": "a bag or two",
  "few-bags": "a few bags",
  carload: "a carload",
};

export function formatGivingSummary(
  categories: DonationCategory[],
  size: DonationSize | null,
): string {
  const categoryText = categories.map((category) => CATEGORY_LABELS[category]).join(", ");
  const capitalized = categoryText.charAt(0).toUpperCase() + categoryText.slice(1);
  const sizeText = size ? SIZE_LABELS[size] : null;
  if (capitalized && sizeText) return `${capitalized} · ${sizeText}`;
  return capitalized || sizeText || "";
}
