"use client";

import { useRouter } from "next/navigation";
import { Crosshair, MapPin } from "lucide-react";
import { Header } from "@/components/header";
import { useDonation, type Coordinates } from "@/lib/donation-store";

type Suggestion = {
  street: string;
  cityState: string;
  coordinates: Coordinates;
};

const CURRENT_LOCATION_COORDINATES: Coordinates = { lat: 42.3601, lng: -71.0589 };

const FAKE_SUGGESTIONS: Suggestion[] = [
  {
    street: "124 Harrison Ave",
    cityState: "Boston, MA 02111",
    coordinates: { lat: 42.3505, lng: -71.0621 },
  },
  {
    street: "124 Harrison St",
    cityState: "Cambridge, MA 02139",
    coordinates: { lat: 42.3736, lng: -71.1097 },
  },
  {
    street: "124 Harvard St",
    cityState: "Brookline, MA 02446",
    coordinates: { lat: 42.3318, lng: -71.1211 },
  },
];

export default function PickupAddressPage() {
  const router = useRouter();
  const { setAddress } = useDonation();

  function selectAddress(address: string, coordinates: Coordinates) {
    setAddress(address, coordinates);
    router.push("/items");
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header />
      <div className="flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <h1 className="text-[21px] font-semibold leading-[1.25] tracking-[-0.025em] text-ink">
          Where should we pick up?
        </h1>

        <div className="mt-5 flex items-center gap-2.5 rounded-[13px] border border-border bg-surface px-3.5 py-3.5 transition-colors focus-within:border-border-strong">
          <MapPin className="h-4 w-4 flex-none text-muted" />
          <input
            type="text"
            placeholder="Enter your address"
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-dim focus:outline-none"
          />
        </div>

        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => selectAddress("Current location", CURRENT_LOCATION_COORDINATES)}
            className="flex w-full items-center gap-3 border-b border-border py-3.5 text-left"
          >
            <Crosshair className="h-[15px] w-[15px] flex-none text-muted" />
            <span className="text-sm text-ink">Use my current location</span>
          </button>

          {FAKE_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.street}
              type="button"
              onClick={() =>
                selectAddress(`${suggestion.street}, ${suggestion.cityState}`, suggestion.coordinates)
              }
              className="flex w-full items-center gap-3 border-b border-border py-3.5 text-left last:border-none"
            >
              <MapPin className="h-[15px] w-[15px] flex-none text-dim" />
              <div>
                <div className="text-sm text-ink">{suggestion.street}</div>
                <div className="mt-0.5 text-xs text-muted">{suggestion.cityState}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
