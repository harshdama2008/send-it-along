import { Header } from "@/components/header";

export default function ItemsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header back="/" />
      <div className="flex-1 px-5">
        <h1 className="text-[22px] font-semibold text-ink">
          What are you giving away?
        </h1>
        <p className="mt-4 text-sm text-muted">
          Category chips, the size selector, and the required photo will go
          here.
        </p>
      </div>
    </div>
  );
}
