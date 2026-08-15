"use client";

import { useState } from "react";
import { Home, Info, MapPin, MessageCircle } from "lucide-react";
import { useDonation } from "@/lib/donation-store";
import { formatGivingSummary } from "@/lib/donation-format";
import { cn } from "@/lib/utils";

const COURIER_NAME = "Marcus";

const TRACK_STEPS = [
  {
    title: "Finding a driver",
    subtitle: "Looking for a courier nearby",
    segmentsFilled: 1,
  },
  {
    title: `${COURIER_NAME} is on the way`,
    subtitle: "Arriving in about 6 minutes",
    segmentsFilled: 2,
  },
  {
    title: "Picked up",
    subtitle: `${COURIER_NAME} has your bags`,
    segmentsFilled: 3,
  },
  {
    title: "Almost there",
    subtitle: "Arriving at the drop-off soon",
    segmentsFilled: 4,
  },
] as const;

export default function TrackPage() {
  const { donation } = useDonation();
  const [stepIndex, setStepIndex] = useState(0);
  const step = TRACK_STEPS[stepIndex];
  const givingSummary = formatGivingSummary(donation.categories, donation.size);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* No header on this screen — the map runs to the top edge. */}
      <div className="relative h-[290px] flex-none overflow-hidden bg-surface">
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

        {/* TEMP: cycles through the four track states for testing — remove before shipping. */}
        <button
          type="button"
          onClick={() => setStepIndex((i) => (i + 1) % TRACK_STEPS.length)}
          className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white"
        >
          Next state ({stepIndex + 1}/4)
        </button>
      </div>

      <div className="-mt-[22px] flex-1 overflow-y-auto rounded-t-[22px] border-t border-border bg-bg px-5 pt-5 pb-[calc(22px+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong" />

        <div className="text-[19px] font-semibold tracking-[-0.025em] text-ink">
          {step.title}
        </div>
        <div className="mt-[5px] text-[13px] text-muted">{step.subtitle}</div>

        <div className="mb-4 mt-[18px] flex gap-[5px]">
          {TRACK_STEPS.map((_, i) => (
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
            {COURIER_NAME.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="text-[14.5px] font-semibold text-ink">{COURIER_NAME}</div>
            <div className="mt-0.5 text-[12.5px] text-muted">Your courier</div>
          </div>
          <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-border bg-surface-2">
            <MessageCircle className="h-[15px] w-[15px] text-muted" />
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-border py-[14px]">
          <Info className="mt-[1px] h-[15px] w-[15px] flex-none text-dim" />
          <span className="text-[12.5px] leading-[1.55] text-muted">
            Set your bags outside before {COURIER_NAME} arrives. You don&apos;t need to
            be there when he gets here.
          </span>
        </div>
      </div>
    </div>
  );
}
