"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Header } from "@/components/header";
import { useDonation, type SelectedCharity } from "@/lib/donation-store";
import { formatCategoryList } from "@/lib/donation-format";
import { cn } from "@/lib/utils";

type FakeCharity = SelectedCharity & { open: boolean };

const FAKE_CHARITIES: FakeCharity[] = [
  {
    placeId: "goodwill-south-end",
    name: "Goodwill — South End",
    address: "520 Harrison Ave, Boston, MA 02118",
    distanceMiles: 1.2,
    closingTime: "Open until 8pm",
    open: true,
  },
  {
    placeId: "salvation-army-boston",
    name: "Salvation Army",
    address: "147 Berkeley St, Boston, MA 02116",
    distanceMiles: 2.8,
    closingTime: "Open until 6pm",
    open: true,
  },
  {
    placeId: "habitat-restore-boston",
    name: "Habitat ReStore",
    address: "60 Freeport St, Dorchester, MA 02122",
    distanceMiles: 4.1,
    closingTime: "Opens 9am tomorrow",
    open: false,
  },
];

export default function PlacesPage() {
  const router = useRouter();
  const { donation, setCharity } = useDonation();

  function chooseCharity(charity: FakeCharity) {
    setCharity({
      placeId: charity.placeId,
      name: charity.name,
      address: charity.address,
      distanceMiles: charity.distanceMiles,
      closingTime: charity.closingTime,
    });
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
          {FAKE_CHARITIES.map((charity) => (
            <button
              key={charity.placeId}
              type="button"
              onClick={() => chooseCharity(charity)}
              className={cn(
                "flex items-center gap-3 rounded-[15px] border border-border bg-surface p-[15px] text-left",
                !charity.open && "opacity-55",
              )}
            >
              <div className="flex-1">
                <div className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                  {charity.name}
                </div>
                <div className="mt-1 flex items-center gap-[7px] text-[12.5px]">
                  <span className="text-muted">{charity.distanceMiles} mi</span>
                  <span className="h-1 w-1 flex-none rounded-full bg-dim" />
                  <span className={charity.open ? "text-open" : "text-dim"}>
                    {charity.closingTime}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-[17px] w-[17px] flex-none text-dim" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-none border-t border-border bg-bg px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-[18px]">
        <button
          type="button"
          onClick={() => chooseCharity(FAKE_CHARITIES.find((c) => c.open) ?? FAKE_CHARITIES[0])}
          className="w-full rounded-[14px] border border-border-strong py-4 text-[15px] font-medium text-ink"
        >
          Pick the closest one for me
        </button>
      </div>
    </div>
  );
}
