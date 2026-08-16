"use client";

import { useRouter } from "next/navigation";
import { Home, MapPin, Package } from "lucide-react";
import { Header } from "@/components/header";
import { useDonation } from "@/lib/donation-store";
import { formatGivingSummary } from "@/lib/donation-format";

export default function ConfirmPage() {
  const router = useRouter();
  const { donation } = useDonation();

  const givingSummary = formatGivingSummary(donation.categories, donation.size);

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
          <span className="text-[22px] font-semibold tracking-[-0.02em] text-ink">$14.00</span>
        </div>
      </div>

      <div className="flex-none border-t border-border bg-bg px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-[18px]">
        <button
          type="button"
          onClick={() => router.push("/track")}
          className="w-full rounded-[14px] bg-brand py-4 text-[15px] font-semibold tracking-[-0.01em] text-white"
        >
          Send it along · $14
        </button>
      </div>
    </div>
  );
}
