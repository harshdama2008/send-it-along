"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { Header } from "@/components/header";
import { useDonation, type DonationCategory, type DonationSize } from "@/lib/donation-store";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS: { value: DonationCategory; label: string }[] = [
  { value: "clothing_shoes", label: "Clothing & shoes" },
  { value: "books", label: "Books" },
  { value: "utensils", label: "Utensils" },
  { value: "bedding", label: "Bedding & towels" },
  { value: "toys", label: "Toys" },
  { value: "electronics", label: "Electronics" },
  { value: "small_furniture", label: "Small furniture" },
];

const SIZE_OPTIONS: { value: DonationSize; label: string; sub?: string }[] = [
  { value: "bag-or-two", label: "A bag or two" },
  { value: "few-bags", label: "A few bags", sub: "Fits in a car back seat" },
  { value: "carload", label: "A carload" },
];

export default function ItemsPage() {
  const router = useRouter();
  const { donation, toggleCategory, setSize, setPhoto, setDonationId } = useDonation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canContinue = donation.categories.length > 0 && donation.size !== null;

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhoto({ file, previewUrl: URL.createObjectURL(file) });
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!donation.photo) return null;

    // 1. Ask the server to mint a presigned upload URL — it's the only
    // party with the service role key needed to talk to Storage directly.
    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: donation.photo.file.name }),
    });
    if (!presignRes.ok) throw new Error("Could not get an upload URL");
    const { path, token, bucket, publicUrl } = await presignRes.json();

    // 2. Upload the file straight from the browser to Storage using that
    // URL — the bytes never pass through our own server.
    const { error: uploadError } = await supabaseBrowser.storage
      .from(bucket)
      .uploadToSignedUrl(path, token, donation.photo.file);
    if (uploadError) throw uploadError;

    return publicUrl as string;
  }

  async function handleContinue() {
    if (!canContinue || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const photoUrl = await uploadPhoto();

      // 3. Create the donation row now that we know the final photo URL.
      const donationRes = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup_address: donation.address,
          pickup_lat: donation.coordinates?.lat ?? null,
          pickup_lng: donation.coordinates?.lng ?? null,
          categories: donation.categories,
          size: donation.size,
          photo_url: photoUrl,
        }),
      });
      if (!donationRes.ok) throw new Error("Could not save your donation");
      const { id } = await donationRes.json();

      // 4. Remember which donation this is, in the store and across reloads.
      setDonationId(id);
      router.push("/places");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header back="/" />

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <h1 className="text-[21px] font-semibold leading-[1.25] tracking-[-0.025em] text-ink">
          What are you giving away?
        </h1>

        <div className="mt-7 flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((option) => {
            const selected = donation.categories.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleCategory(option.value)}
                className={cn(
                  "rounded-full border px-3.5 py-2.5 text-[13px]",
                  selected
                    ? "border-brand bg-brand font-semibold text-white"
                    : "border-border bg-surface text-muted",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <h2 className="mt-7 text-xs font-semibold tracking-[0.02em] text-muted">
          How much?
        </h2>
        <div className="mt-2.5 flex flex-col gap-2">
          {SIZE_OPTIONS.map((option) => {
            const selected = donation.size === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setSize(option.value)}
                className={cn(
                  "flex items-center justify-between rounded-[13px] border px-[15px] py-[13px] text-left",
                  selected ? "border-brand bg-surface-2" : "border-border bg-surface",
                )}
              >
                <div>
                  <div className="text-sm font-medium text-ink">{option.label}</div>
                  {option.sub ? (
                    <div className="mt-0.5 text-xs text-muted">{option.sub}</div>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[1.5px]",
                    selected ? "border-brand bg-brand" : "border-border-strong",
                  )}
                >
                  {selected ? <span className="h-[9px] w-[9px] rounded-full bg-white" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <h2 className="mt-7 text-xs font-semibold tracking-[0.02em] text-muted">
          Add a photo
        </h2>
        <label className="mt-2.5 block cursor-pointer rounded-2xl border-[1.5px] border-dashed border-border-strong px-4 py-5 text-center">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="sr-only"
          />
          {donation.photo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a static/remote asset */}
              <img
                src={donation.photo.previewUrl}
                alt="The pile you're giving away"
                className="mx-auto h-32 w-full max-w-[220px] rounded-xl object-cover"
              />
              <div className="mt-2.5 text-xs font-medium text-muted">Tap to change photo</div>
            </>
          ) : (
            <>
              <Camera className="mx-auto mb-2 h-[22px] w-[22px] text-dim" strokeWidth={1.8} />
              <div className="text-sm font-medium text-ink">Photo of the whole pile</div>
              <div className="mt-1 text-xs leading-relaxed text-muted">
                Everything together, where you&apos;ll leave it — so we know
                what to send.
              </div>
            </>
          )}
        </label>
      </div>

      <div className="flex-none border-t border-border bg-bg px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-[18px]">
        {submitError ? (
          <div className="mb-2.5 text-center text-xs text-destructive">{submitError}</div>
        ) : null}
        <button
          type="button"
          disabled={!canContinue || isSubmitting}
          onClick={handleContinue}
          className={cn(
            "w-full rounded-[14px] py-4 text-[15px] font-semibold tracking-[-0.01em]",
            canContinue ? "bg-brand text-white" : "bg-surface-2 text-dim",
          )}
        >
          {isSubmitting ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
