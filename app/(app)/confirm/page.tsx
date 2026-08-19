"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, MapPin, Package } from "lucide-react";
import { Header } from "@/components/header";
import { useDonation } from "@/lib/donation-store";
import { formatGivingSummary, formatPriceCents } from "@/lib/donation-format";

export default function ConfirmPage() {
  const router = useRouter();
  const { donation } = useDonation();
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const givingSummary = formatGivingSummary(donation.categories, donation.size);

  async function handleSendItAlong() {
    if (isDispatching || !donation.donationId) return;

    setIsDispatching(true);
    setDispatchError(null);

    try {
      // Demo mode skips payment entirely and calls dispatch directly
      // (CLAUDE.md section 11). When Stripe lands in Part K, the payment
      // sheet opens here and only calls /api/dispatch after its webhook
      // confirms — "never dispatch before payment resolves" (section 1).
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationId: donation.donationId }),
      });
      if (!res.ok) throw new Error("Could not send it along");

      router.push("/track");
    } catch (error) {
      setDispatchError(error instanceof Error ? error.message : "Could not send it along");
      setIsDispatching(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header back="/places" />

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <h1 className="text-[21px] font-semibold leading-[1.25] tracking-[-0.025em] text-ink">
          Ready when you are
        </h1>

        <div className="mt-7">
          <div className="flex gap-[13px] border-b border-border py-[14px]">
            <div className="w-[26px] flex-none pt-[1px] text-dim">
              <MapPin className="h-[17px] w-[17px]" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Pickup
              </div>
              <div className="mt-1 text-sm leading-[1.45] text-ink">
                {donation.address ?? "Your address"}
                <br />
                Leave bags by the front door
              </div>
            </div>
          </div>

          <div className="flex gap-[13px] border-b border-border py-[14px]">
            <div className="w-[26px] flex-none pt-[1px] text-dim">
              <Home className="h-[17px] w-[17px]" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Goes to
              </div>
              <div className="mt-1 text-sm leading-[1.45] text-ink">
                {donation.charity?.name ?? "A nearby charity"}
                <br />
                <span className="text-[13px] text-muted">
                  {donation.charity
                    ? `${donation.charity.distanceMiles} mi · ${donation.charity.closingTime}`
                    : null}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-[13px] py-[14px]">
            <div className="w-[26px] flex-none pt-[1px] text-dim">
              <Package className="h-[17px] w-[17px]" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Giving
              </div>
              <div className="mt-1 text-sm leading-[1.45] text-ink">{givingSummary}</div>
            </div>
            <div className="flex h-[52px] w-[52px] flex-none items-center justify-center overflow-hidden rounded-[9px] border border-border bg-surface-2">
              {donation.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a static/remote asset
                <img
                  src={donation.photo.previewUrl}
                  alt="The pile you're giving away"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[10px] text-dim">photo</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-[14px] pb-1">
          <span className="text-sm text-muted">Pickup &amp; delivery</span>
          {donation.isQuoting ? (
            <span className="h-[22px] w-16 animate-pulse rounded-md bg-surface-2" />
          ) : donation.quoteError ? (
            <span className="text-sm text-destructive">{donation.quoteError}</span>
          ) : donation.priceCents != null ? (
            <span className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
              {formatPriceCents(donation.priceCents)}
            </span>
          ) : (
            <span className="h-[22px] w-16 animate-pulse rounded-md bg-surface-2" />
          )}
        </div>
      </div>

      <div className="flex-none border-t border-border bg-bg px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-[18px]">
        {dispatchError ? (
          <div className="mb-2.5 text-center text-xs text-destructive">{dispatchError}</div>
        ) : null}
        <button
          type="button"
          disabled={donation.isQuoting || isDispatching}
          onClick={handleSendItAlong}
          className="w-full rounded-[14px] bg-brand py-4 text-[15px] font-semibold tracking-[-0.01em] text-white disabled:opacity-60"
        >
          {isDispatching
            ? "Sending…"
            : donation.priceCents != null
              ? `Send it along · ${formatPriceCents(donation.priceCents)}`
              : "Send it along"}
        </button>
      </div>
    </div>
  );
}
