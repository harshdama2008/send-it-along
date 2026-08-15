"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const DONATION_ID_STORAGE_KEY = "send-it-along:donation-id";

export type DonationCategory =
  | "clothing_shoes"
  | "books"
  | "utensils"
  | "bedding"
  | "toys"
  | "electronics"
  | "small_furniture";

export type DonationSize = "bag-or-two" | "few-bags" | "carload";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type DonationPhoto = {
  file: File;
  previewUrl: string;
};

export type SelectedCharity = {
  placeId: string;
  name: string;
  address: string;
  distanceMiles: number | null;
  closingTime: string | null;
};

export type DonationState = {
  donationId: string | null;
  address: string | null;
  coordinates: Coordinates | null;
  categories: DonationCategory[];
  size: DonationSize | null;
  photo: DonationPhoto | null;
  charity: SelectedCharity | null;
  priceCents: number | null;
};

const initialState: DonationState = {
  donationId: null,
  address: null,
  coordinates: null,
  categories: [],
  size: null,
  photo: null,
  charity: null,
  priceCents: null,
};

type DonationContextValue = {
  donation: DonationState;
  setAddress: (address: string, coordinates: Coordinates) => void;
  toggleCategory: (category: DonationCategory) => void;
  setSize: (size: DonationSize) => void;
  setPhoto: (photo: DonationPhoto | null) => void;
  setCharity: (charity: SelectedCharity | null) => void;
  setPriceCents: (priceCents: number | null) => void;
  setDonationId: (donationId: string | null) => void;
  reset: () => void;
};

const DonationContext = createContext<DonationContextValue | null>(null);

export function DonationProvider({ children }: { children: ReactNode }) {
  const [donation, setDonation] = useState<DonationState>(initialState);

  // The donation id is the one piece of this store that survives a reload —
  // it identifies a real server-side row, not just in-progress form state.
  useEffect(() => {
    const storedId = window.localStorage.getItem(DONATION_ID_STORAGE_KEY);
    if (storedId) setDonation((prev) => ({ ...prev, donationId: storedId }));
  }, []);

  const value = useMemo<DonationContextValue>(
    () => ({
      donation,
      setAddress: (address, coordinates) =>
        setDonation((prev) => ({ ...prev, address, coordinates })),
      toggleCategory: (category) =>
        setDonation((prev) => ({
          ...prev,
          categories: prev.categories.includes(category)
            ? prev.categories.filter((c) => c !== category)
            : [...prev.categories, category],
        })),
      setSize: (size) => setDonation((prev) => ({ ...prev, size })),
      setPhoto: (photo) =>
        setDonation((prev) => {
          if (prev.photo) URL.revokeObjectURL(prev.photo.previewUrl);
          return { ...prev, photo };
        }),
      setCharity: (charity) => setDonation((prev) => ({ ...prev, charity })),
      setPriceCents: (priceCents) => setDonation((prev) => ({ ...prev, priceCents })),
      setDonationId: (donationId) => {
        if (donationId) window.localStorage.setItem(DONATION_ID_STORAGE_KEY, donationId);
        else window.localStorage.removeItem(DONATION_ID_STORAGE_KEY);
        setDonation((prev) => ({ ...prev, donationId }));
      },
      reset: () =>
        setDonation((prev) => {
          if (prev.photo) URL.revokeObjectURL(prev.photo.previewUrl);
          window.localStorage.removeItem(DONATION_ID_STORAGE_KEY);
          return initialState;
        }),
    }),
    [donation],
  );

  return <DonationContext.Provider value={value}>{children}</DonationContext.Provider>;
}

export function useDonation() {
  const ctx = useContext(DonationContext);
  if (!ctx) throw new Error("useDonation must be used within a DonationProvider");
  return ctx;
}
