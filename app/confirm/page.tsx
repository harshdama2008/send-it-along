import { Header } from "@/components/header";

export default function ConfirmPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header back="/places" />
      <div className="flex-1 px-5">
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
