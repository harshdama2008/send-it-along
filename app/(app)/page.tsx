"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, MapPin } from "lucide-react";
import { Header } from "@/components/header";
import { useDonation, type Coordinates } from "@/lib/donation-store";

type AddressSuggestion = {
  formattedAddress: string;
  lat: number;
  lng: number;
};

async function fetchSuggestions(
  body: { query: string } | { lat: number; lng: number },
): Promise<AddressSuggestion[]> {
  const res = await fetch("/api/places/autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Could not fetch address suggestions");
  const data = (await res.json()) as { suggestions?: AddressSuggestion[] };
  return data.suggestions ?? [];
}

// Geoapify's `formatted` is one string ("124 Harrison Ave, Boston, MA
// 02111, United States"); split it for the street / city-state two-line
// row without needing a second API field.
function splitAddressLines(formattedAddress: string): { line1: string; line2: string } {
  const [line1, ...rest] = formattedAddress.split(", ");
  return { line1, line2: rest.join(", ") };
}

export default function PickupAddressPage() {
  const router = useRouter();
  const { setAddress } = useDonation();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const latestRequestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      latestRequestId.current += 1;
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const requestId = ++latestRequestId.current;
    setIsSearching(true);

    const timeoutId = setTimeout(async () => {
      try {
        const results = await fetchSuggestions({ query: trimmed });
        if (latestRequestId.current === requestId) {
          setSuggestions(results);
        }
      } catch {
        if (latestRequestId.current === requestId) {
          setSuggestions([]);
        }
      } finally {
        if (latestRequestId.current === requestId) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  function selectAddress(address: string, coordinates: Coordinates) {
    setAddress(address, coordinates);
    router.push("/items");
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support location.");
      return;
    }
    setLocationError(null);
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const [match] = await fetchSuggestions({ lat: latitude, lng: longitude });
          if (match) {
            selectAddress(match.formattedAddress, { lat: match.lat, lng: match.lng });
          } else {
            setLocationError("Couldn't find an address for your location.");
          }
        } catch {
          setLocationError("Couldn't look up your location.");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setLocationError("Couldn't get your location. Check your browser's location permission.");
        setIsLocating(false);
      },
    );
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
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Enter your address"
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-dim focus:outline-none"
          />
        </div>

        {locationError ? <p className="mt-2 text-xs text-destructive">{locationError}</p> : null}

        <div className="mt-1.5">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="flex w-full items-center gap-3 border-b border-border py-3.5 text-left disabled:opacity-60"
          >
            <Crosshair className="h-[15px] w-[15px] flex-none text-muted" />
            <span className="text-sm text-ink">
              {isLocating ? "Finding your location…" : "Use my current location"}
            </span>
          </button>

          {suggestions.length > 0 ? (
            suggestions.map((suggestion) => {
              const { line1, line2 } = splitAddressLines(suggestion.formattedAddress);
              return (
                <button
                  key={`${suggestion.lat}-${suggestion.lng}`}
                  type="button"
                  onClick={() =>
                    selectAddress(suggestion.formattedAddress, {
                      lat: suggestion.lat,
                      lng: suggestion.lng,
                    })
                  }
                  className="flex w-full items-center gap-3 border-b border-border py-3.5 text-left last:border-none"
                >
                  <MapPin className="h-[15px] w-[15px] flex-none text-dim" />
                  <div>
                    <div className="text-sm text-ink">{line1}</div>
                    {line2 ? <div className="mt-0.5 text-xs text-muted">{line2}</div> : null}
                  </div>
                </button>
              );
            })
          ) : isSearching ? (
            <p className="py-3.5 text-sm text-dim">Searching…</p>
          ) : query.trim() ? (
            <p className="py-3.5 text-sm text-dim">No matches.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
