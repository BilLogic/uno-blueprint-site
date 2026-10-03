"use client";

import { view as content } from "@/content/view";
import { useView } from "@/hooks/use-view";
import { ViewIcon } from "./ViewIcon";

/** The two-icon switch beside the logo; the footer menu offers the same choice on phones. */
export function ViewSwitch() {
  const { view, setView } = useView();
  return (
    <div
      role="group"
      aria-label={content.label}
      className="inline-flex rounded-10 border border-line bg-card p-0.5 max-xs:hidden"
    >
      {content.options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={view === option.value}
          aria-label={option.switchLabel}
          title={option.switchLabel}
          onClick={() => setView(option.value)}
          className="grid h-8 w-8.5 cursor-pointer place-items-center rounded-8 text-muted transition-colors duration-t-1 hover:text-ink aria-pressed:bg-panel aria-pressed:text-ink aria-pressed:shadow-[0_0_0_1px_var(--color-line)] [&_svg]:size-[15px]"
        >
          <ViewIcon view={option.value} />
        </button>
      ))}
    </div>
  );
}
