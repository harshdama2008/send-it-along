import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type HeaderProps = {
  /**
   * Href to navigate back to. Omit to render an empty slot of the same
   * height, so the title below still lines up with screens that do show
   * a back button.
   */
  back?: string;
};

export function Header({ back }: HeaderProps) {
  return (
    <div className="px-5 pt-[env(safe-area-inset-top)]">
      <div className="mb-[18px] flex h-[34px] items-center">
        {back ? (
          <Link
            href={back}
            aria-label="Back"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-border bg-surface text-muted"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
