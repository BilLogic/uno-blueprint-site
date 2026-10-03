import type { ReactNode } from "react";

/** The chip-style tab rows of the install and skills steps. */
export const tabListClassName = "flex flex-wrap gap-1";
export const tabClassName =
  "min-h-9 cursor-pointer rounded-8 border border-line bg-panel px-3.25 text-13 leading-none font-medium text-muted aria-selected:border-card-2 aria-selected:bg-card-2 aria-selected:text-ink";

/** A row's copy button stays out of the way until the row is pointed at or focused; a touch screen always shows it. */
export const revealCopy =
  "opacity-0 transition-opacity duration-t-1 ease-plain group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100";

export function StepLabel({ children }: { children: ReactNode }) {
  return <h3 className="text-20 font-medium tracking-label">{children}</h3>;
}

export function StepSub({ children }: { children: ReactNode }) {
  return <p className="text-pretty text-muted">{children}</p>;
}
