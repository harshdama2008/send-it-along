import { Header } from "@/components/header";

export default function ConfirmPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header back="/places" />
      <div className="flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <h1 className="text-[22px] font-semibold text-ink">
          Ready when you are
        </h1>
        <p className="mt-4 text-sm text-muted">
          Pickup, destination, and giving summary rows, plus the price and
          &ldquo;Send it along&rdquo; button, will go here.
        </p>
      </div>
    </div>
  );
}
