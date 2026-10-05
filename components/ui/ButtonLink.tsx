import type { SiteLink } from "@/content/links";
import { anchorProps } from "./anchor-props";

type ButtonLinkProps = {
  link: SiteLink;
  variant: "primary" | "ghost";
  children: string;
  /** What the button says while its target is not ready, such as "Case study coming soon". */
  soonLabel?: string;
};

const base =
  "inline-flex h-9.5 items-center gap-2 rounded-10 border px-4 text-14 leading-none font-medium whitespace-nowrap";

const variants = {
  primary: "border-transparent bg-primary text-on-primary hover:bg-primary-hover",
  ghost: "border-line-2 bg-panel text-ink hover:border-line-hot",
} as const;

/**
 * A link styled as a button. One whose target is not ready yet is disabled, as
 * every such link is, and keeps its own look; it says so in its label, which
 * is its `soonLabel` (the case card's "Case study coming soon").
 * Setting the real href and dropping `notReady` makes it live.
 */
export function ButtonLink({ link, variant, children, soonLabel }: ButtonLinkProps) {
  if (link.notReady) {
    return (
      <a {...anchorProps(link)} className={`${base} cursor-not-allowed ${variants[variant]}`}>
        {soonLabel ?? children}
      </a>
    );
  }
  return (
    <a {...anchorProps(link)} className={`${base} ${variants[variant]}`}>
      {children}
    </a>
  );
}
