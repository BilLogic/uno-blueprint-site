import { comingSoon } from "@/content/links";

/** The quiet tag beside a control whose target is not ready yet. */
export function SoonTag() {
  return (
    <span className="rounded-pill border border-line-2 px-1.75 py-0.75 text-11 font-medium whitespace-nowrap text-muted">
      {comingSoon}
    </span>
  );
}
