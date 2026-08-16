import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-bg sm:border-x sm:border-border sm:shadow-sm">
      {children}
    </div>
  );
}
