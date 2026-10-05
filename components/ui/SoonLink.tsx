import { useId } from "react";
import { comingSoon, type SiteLink } from "@/content/links";
import { anchorProps } from "./anchor-props";

type SoonLinkProps = {
  link: SiteLink;
  /** Where the tooltip sits. A nav item is at the top of the page, so its tooltip goes below. */
  side: "above" | "below";
  /** The wrapper's layout, so the item sits in its row as the link would. */
  wrapClassName: string;
  className: string;
  children: string;
};

const bubble =
  "pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-6 bg-ink px-2 py-1.5 text-12 leading-none font-medium whitespace-nowrap text-bg shadow-menu opacity-0 transition-opacity duration-t-1 ease-plain group-focus-within/soon:opacity-100 group-hover/soon:opacity-100 motion-reduce:transition-none";

const sides = {
  above: "bottom-full mb-1.5",
  below: "top-3/4",
} as const;

/**
 * A button or nav item whose target is not ready yet: disabled, as every such
 * link is, in its own look, with its label only. Hovering it, focusing it or, on a
 * touch screen, tapping it shows a "Coming soon" tooltip, which is its
 * description rather than part of its name. It takes focus so a keyboard can
 * reach that tooltip; the tooltip itself never takes a click.
 */
export function SoonLink({ link, side, wrapClassName, className, children }: SoonLinkProps) {
  const tipId = useId();
  return (
    <span className={`group/soon relative ${wrapClassName}`}>
      <a {...anchorProps(link)} tabIndex={0} aria-describedby={tipId} className={className}>
        {children}
      </a>
      <span id={tipId} role="tooltip" className={`${bubble} ${sides[side]}`}>
        {comingSoon}
      </span>
    </span>
  );
}
