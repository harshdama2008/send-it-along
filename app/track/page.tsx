export default function TrackPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* No header on this screen — the map runs to the top edge. */}
      <div className="flex h-64 flex-none items-center justify-center bg-surface text-sm text-dim">
        Live tracking map (Uber tracking_url iframe) will go here.
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5">
        <p className="text-sm text-muted">
          Status, progress bar, going-to, your bags, and courier rows will go
          here.
        </p>
      </div>
    </div>
  );
}
