"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Header } from "@/components/header";
import { useDonation } from "@/lib/donation-store";
import { formatCategoryList } from "@/lib/donation-format";
import { cn } from "@/lib/utils";

type CharityResult = {
  placeId: string;
  name: string;
  address: string;
  distanceMiles: number;
  isOpen: boolean;
  hoursAreApproximate: boolean;
  hoursText: string;
};

export default function PlacesPage() {
  const router = useRouter();
  const { donation, setCharity, startQuote, setPriceCents, setQuoteError } = useDonation();

  const [charities, setCharities] = useState<CharityResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lat = donation.coordinates?.lat;
  const lng = donation.coordinates?.lng;
  const hasCoordinates = typeof lat === "number" && typeof lng === "number";
  const categoriesKey = donation.categories.join(",");

  useEffect(() => {
    if (!hasCoordinates) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch("/api/charities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, categories: donation.categories }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not find nearby charities");
        const data = (await res.json()) as { charities?: CharityResult[] };
        if (!cancelled) setCharities(data.charities ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not find nearby charities");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- donation.categories is covered by categoriesKey
  }, [hasCoordinates, lat, lng, categoriesKey]);

  function chooseCharity(charity: CharityResult) {
    setCharity({
      placeId: charity.placeId,
      name: charity.name,
      address: charity.address,
      distanceMiles: charity.distanceMiles,
      closingTime: charity.hoursText,
    });

    // Fire the quote and move on immediately — /confirm shows a skeleton
    // for the price rather than making the user wait here for it.
    startQuote();
    if (donation.donationId) {
      fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donationId: donation.donationId,
          charity: { placeId: charity.placeId, name: charity.name, address: charity.address },
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Could not get a price");
          const data = (await res.json()) as { priceCents?: number };
          if (typeof data.priceCents !== "number") throw new Error("Could not get a price");
          setPriceCents(data.priceCents);
        })
        .catch((err: unknown) => {
          setQuoteError(err instanceof Error ? err.message : "Could not get a price");
        });
    } else {
      setQuoteError("Missing donation");
    }

    router.push("/confirm");
  }

  const categoryText = formatCategoryList(donation.categories);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header back="/items" />

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <h1 className="text-[21px] font-semibold leading-[1.25] tracking-[-0.025em] text-ink">
          Places that take these
        </h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Near {donation.address ?? "your address"}
          {categoryText ? ` · ${categoryText}` : ""}
        </p>

        <div className="mt-7 flex flex-col gap-[9px]">
          {!hasCoordinates ? (
            <p className="py-3.5 text-sm text-dim">Missing pickup address.</p>
          ) : isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[70px] animate-pulse rounded-[15px] border border-border bg-surface"
              />
            ))
          ) : error ? (
            <p className="py-3.5 text-sm text-dim">{error}</p>
          ) : charities.length === 0 ? (
            <p className="py-3.5 text-sm text-dim">
              Nothing nearby is currently accepting these items.
            </p>
          ) : (
            charities.map((charity) => (
              <button
                key={charity.placeId}
                type="button"
                onClick={() => chooseCharity(charity)}
                className={cn(
                  "flex items-center gap-3 rounded-[15px] border border-border bg-surface p-[15px] text-left",
                  !charity.isOpen && "opacity-55",
                )}
              >
                <div className="flex-1">
                  <div className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                    {charity.name}
                  </div>
                  <div className="mt-1 flex items-center gap-[7px] text-[12.5px]">
                    <span className="text-muted">{charity.distanceMiles} mi</span>
                    <span className="h-1 w-1 flex-none rounded-full bg-dim" />
                    <span className={charity.isOpen ? "text-open" : "text-dim"}>
                      {charity.hoursText}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-[17px] w-[17px] flex-none text-dim" />
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-none border-t border-border bg-bg px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-[18px]">
        <button
          type="button"
          disabled={isLoading || charities.length === 0}
          onClick={() => chooseCharity(charities.find((c) => c.isOpen) ?? charities[0])}
          className="w-full rounded-[14px] border border-border-strong py-4 text-[15px] font-medium text-ink disabled:opacity-50"
        >
          Pick the closest one for me
        </button>
      </div>
    </div>
  );
}
