import { Header } from "@/components/header";

export default function PlacesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header back="/items" />
      <div className="flex-1 px-5">
        <h1 className="text-[22px] font-semibold text-ink">
          Places that take these
        </h1>
        <p className="mt-1 text-sm text-muted">
          Near {"{address}"} · {"{categories}"}
        </p>
        <p className="mt-4 text-sm text-dim">
          The three charity cards and &ldquo;Pick the closest one for
          me&rdquo; footer will go here.
        </p>
      </div>
    </div>
  );
}
