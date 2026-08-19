import type { DonationCategory, DonationSize } from "@/lib/donation-store";

export const CATEGORY_LABELS: Record<DonationCategory, string> = {
  clothing_shoes: "clothing & shoes",
  books: "books",
  utensils: "utensils",
  bedding: "bedding & towels",
  toys: "toys",
  electronics: "electronics",
  small_furniture: "small furniture",
};

export const SIZE_LABELS: Record<DonationSize, string> = {
  "bag-or-two": "a bag or two",
  "few-bags": "a few bags",
  carload: "a carload",
};

export function formatCategoryPhrase(categories: DonationCategory[]): string {
  const categoryText = categories.map((category) => CATEGORY_LABELS[category]).join(", ");
  return categoryText.charAt(0).toUpperCase() + categoryText.slice(1);
}

export function formatGivingSummary(
  categories: DonationCategory[],
  size: DonationSize | null,
): string {
  const capitalized = formatCategoryPhrase(categories);
  const sizeText = size ? SIZE_LABELS[size] : null;
  if (capitalized && sizeText) return `${capitalized} · ${sizeText}`;
  return capitalized || sizeText || "";
}

export function formatPriceCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatCategoryList(categories: DonationCategory[]): string {
  const labels = categories.map((category) => CATEGORY_LABELS[category]);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
}
