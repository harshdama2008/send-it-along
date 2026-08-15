import { Header } from "@/components/header";

export default function DonePage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <div className="flex-1 px-5">
        <h1 className="text-[22px] font-semibold text-ink">Sent along</h1>
        <p className="mt-1 text-sm text-muted">Dropped off at {"{time}"} today</p>
        <p className="mt-4 text-sm text-dim">
          The receipt card and &ldquo;Send something else&rdquo; button will
          go here.
        </p>
      </div>
    </div>
  );
}
