"use client";

import { useEffect, useState } from "react";
import { Home, Info, MapPin, MessageCircle } from "lucide-react";
import { useDonation } from "@/lib/donation-store";
import { formatGivingSummary } from "@/lib/donation-format";
import { cn } from "@/lib/utils";
import { TrackingMap } from "@/components/tracking-map";

const POLL_INTERVAL_MS = 2000;

// The statuses this screen ever needs to react to. Pre-dispatch statuses
// (draft, quoted, paid) never reach /track, and payment_failed/quote_expired
// belong to earlier screens.
type TrackStatus =
  | "dispatched"
  | "courier_assigned"
  | "picked_up"
  | "delivered"
  | "dispatch_failed"
  | "cancelled";

const TERMINAL_STATUSES: TrackStatus[] = ["delivered", "dispatch_failed", "cancelled"];

type DonationRow = {
  status: TrackStatus;
  courier_name: string | null;
  courier_imminent: boolean | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  charity_lat: number | null;
  charity_lng: number | null;
};

type TrackStep = {
  title: string;
  subtitle: string;
  segmentsFilled: number;
};

function stepFor(row: DonationRow): TrackStep {
  const courierName = row.courier_name ?? "Your courier";

  switch (row.status) {
    case "dispatched":
      return { title: "Finding a driver", subtitle: "Looking for a courier nearby", segmentsFilled: 1 };
    case "courier_assigned":
      return {
        title: `${courierName} is on the way`,
        subtitle: "Heading to pick up your bags",
        segmentsFilled: 2,
      };
    case "picked_up":
      return row.courier_imminent
        ? { title: "Almost there", subtitle: "Arriving at the drop-off soon", segmentsFilled: 4 }
        : { title: "Picked up", subtitle: `${courierName} has your bags`, segmentsFilled: 3 };
    case "delivered":
      return { title: "Delivered", subtitle: "Dropped off at the charity", segmentsFilled: 4 };
    case "dispatch_failed":
      return { title: "Couldn't find a courier", subtitle: "We're looking into it", segmentsFilled: 0 };
    case "cancelled":
      return { title: "Cancelled", subtitle: "This pickup was cancelled", segmentsFilled: 0 };
    default:
      return { title: "Finding a driver", subtitle: "Looking for a courier nearby", segmentsFilled: 1 };
  }
}

export default function TrackPage() {
  const { donation } = useDonation();
  const donationId = donation.donationId;
  const [row, setRow] = useState<DonationRow | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (!donationId) return;

    let cancelled = false;
    const intervalRef: { current: ReturnType<typeof setInterval> | undefined } = { current: undefined };

    async function poll() {
      try {
        const res = await fetch(`/api/donations/${donationId}`);
        if (!res.ok || cancelled) return;

        const data = (await res.json()) as DonationRow;
        if (cancelled) return;

        setRow(data);
        if (TERMINAL_STATUSES.includes(data.status)) clearInterval(intervalRef.current);
      } catch {
        // Transient network error — the next tick tries again.
      }
    }

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
  }, [donationId]);

  const step = row ? stepFor(row) : { title: "Finding a driver", subtitle: "Looking for a courier nearby", segmentsFilled: 1 };
  const courierName = row?.courier_name ?? null;
  const givingSummary = formatGivingSummary(donation.categories, donation.size);

  const hasMapCoordinates =
    typeof row?.pickup_lat === "number" &&
    typeof row?.pickup_lng === "number" &&
    typeof row?.charity_lat === "number" &&
    typeof row?.charity_lng === "number";
  const showMap = hasMapCoordinates && !mapFailed;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* No header on this screen — the map runs to the top edge. */}
      <div className="relative h-[290px] flex-none overflow-hidden bg-surface">
        {showMap && row ? (
          <TrackingMap
            pickup={{ lat: row.pickup_lat as number, lng: row.pickup_lng as number }}
            dropoff={{ lat: row.charity_lat as number, lng: row.charity_lng as number }}
            onTilesUnavailable={() => setMapFailed(true)}
          />
        ) : (
          <>
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d="M22 76 Q40 76 46 50 Q52 22 76 22"
                fill="none"
                stroke="#2E7BC4"
                strokeWidth="0.6"
                strokeDasharray="1.4 3"
                strokeLinecap="round"
              />
            </svg>
            <MapPin
              className="absolute h-7 w-7 -translate-x-1/2 -translate-y-full text-brand"
              style={{ left: "22%", top: "76%" }}
              fill="white"
              strokeWidth={2}
            />
            <MapPin
              className="absolute h-7 w-7 -translate-x-1/2 -translate-y-full text-open"
              style={{ left: "76%", top: "22%" }}
              fill="white"
              strokeWidth={2}
            />
          </>
        )}
      </div>

      <div className="-mt-[22px] flex-1 overflow-y-auto rounded-t-[22px] border-t border-border bg-bg px-5 pt-5 pb-[calc(22px+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong" />

        <div className="text-[19px] font-semibold tracking-[-0.025em] text-ink">
          {step.title}
        </div>
        <div className="mt-[5px] text-[13px] text-muted">{step.subtitle}</div>

        <div className="mb-4 mt-[18px] flex gap-[5px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-[3px] flex-1 rounded-full",
                i < step.segmentsFilled ? "bg-brand" : "bg-surface-2",
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-border py-[14px]">
          <div className="w-[22px] flex-none text-dim">
            <Home className="h-[18px] w-[18px]" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
              Going to
            </div>
            <div className="mt-[3px] text-[15px] font-semibold tracking-[-0.01em] text-ink">
              {donation.charity?.name ?? "A nearby charity"}
            </div>
            {donation.charity ? (
              <div className="mt-0.5 text-[12.5px] text-muted">
                {donation.charity.distanceMiles} mi · {donation.charity.closingTime}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border py-[14px]">
          <div className="flex h-[42px] w-[42px] flex-none items-center justify-center overflow-hidden rounded-[9px] border border-border bg-surface-2">
            {donation.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a static/remote asset
              <img
                src={donation.photo.previewUrl}
                alt="The pile you're giving away"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[9px] text-dim">photo</span>
            )}
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
              Your bags
            </div>
            <div className="mt-[3px] text-sm text-ink">{givingSummary}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border py-[14px]">
          <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-border bg-surface-2 text-[13px] font-semibold text-muted">
            {courierName ? courierName.charAt(0) : "?"}
          </div>
          <div className="flex-1">
            <div className="text-[14.5px] font-semibold text-ink">{courierName ?? "Waiting for a courier"}</div>
            <div className="mt-0.5 text-[12.5px] text-muted">Your courier</div>
          </div>
          <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-border bg-surface-2">
            <MessageCircle className="h-[15px] w-[15px] text-muted" />
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-border py-[14px]">
          <Info className="mt-[1px] h-[15px] w-[15px] flex-none text-dim" />
          <span className="text-[12.5px] leading-[1.55] text-muted">
            Set your bags outside before {courierName ?? "your courier"} arrives. You don&apos;t need to
            be there when they get here.
          </span>
        </div>
      </div>
    </div>
  );
}
