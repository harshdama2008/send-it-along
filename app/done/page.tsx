"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Header } from "@/components/header";
import { useDonation } from "@/lib/donation-store";
import { formatCategoryPhrase, SIZE_LABELS } from "@/lib/donation-format";

export default function DonePage() {
  const router = useRouter();
  const { donation, reset } = useDonation();

  const itemsPhrase = formatCategoryPhrase(donation.categories);
  const sizeLabel = donation.size ? SIZE_LABELS[donation.size] : null;
  const amountPhrase = sizeLabel
    ? sizeLabel.charAt(0).toUpperCase() + sizeLabel.slice(1)
    : "—";

  function handleSendAnother() {
    reset();
    router.push("/");
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header />

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="mb-[22px] flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-open">
          <Check className="h-6 w-6 text-open" strokeWidth={2.2} />
        </div>

        <h1 className="text-[21px] font-semibold leading-[1.25] tracking-[-0.025em] text-ink">
          Sent along
        </h1>
        <p className="mt-1.5 text-[13px] text-muted">Dropped off at 4:52pm today</p>

        <div className="mt-7 rounded-[14px] border border-border bg-surface p-[15px]">
          <div className="flex justify-between py-[7px] text-[13px]">
            <span className="text-muted">Went to</span>
            <span className="text-ink">{donation.charity?.name ?? "A nearby charity"}</span>
          </div>
          <div className="flex justify-between py-[7px] text-[13px]">
            <span className="text-muted">Items</span>
            <span className="text-ink">{itemsPhrase || "—"}</span>
          </div>
          <div className="flex justify-between py-[7px] text-[13px]">
            <span className="text-muted">Amount</span>
            <span className="text-ink">{amountPhrase}</span>
          </div>
          <div className="flex justify-between py-[7px] text-[13px]">
            <span className="text-muted">Paid</span>
            <span className="text-ink">$14.00</span>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-[60px] w-[60px] flex-none items-center justify-center overflow-hidden rounded-[9px] border border-border bg-surface-2">
            {donation.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a static/remote asset
              <img
                src={donation.photo.previewUrl}
                alt="The pile you gave away"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[10px] text-dim">photo</span>
            )}
          </div>
          <p className="flex-1 text-[12.5px] leading-[1.5] text-muted">
            Receipt saved on this device.
            <br />
            Yours to keep for your records.
          </p>
        </div>
      </div>

      <div className="flex-none border-t border-border bg-bg px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-[18px]">
        <button
          type="button"
          className="mb-[9px] w-full rounded-[14px] border border-border-strong py-4 text-[15px] font-medium text-ink"
        >
          Email me a copy
        </button>
        <button
          type="button"
          onClick={handleSendAnother}
          className="w-full rounded-[14px] bg-brand py-4 text-[15px] font-semibold tracking-[-0.01em] text-white"
        >
          Send something else
        </button>
      </div>
    </div>
  );
}
