import { useId } from "react";
import { comingSoon, type SiteLink } from "@/content/links";
import { anchorProps } from "./anchor-props";

type SoonLinkProps = {
  link: SiteLink;
  /** The wrapper's layout, so the item sits in its row as the link would. */
  wrapClassName: string;
  /** The link's shape and resting look, with no hover: a disabled link does not answer the pointer. */
  className: string;
  /** Where the tooltip sits below the link. */
  tipClassName: string;
  children: string;
};

/** How every link whose target is not ready yet looks: faded, muted, and not clickable. */
const disabled = "cursor-not-allowed text-muted opacity-50";

const bubble =
  "pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-6 bg-ink px-2 py-1.5 text-12 leading-none font-medium whitespace-nowrap text-bg shadow-menu opacity-0 transition-opacity duration-t-1 ease-plain group-focus-within/soon:opacity-100 group-hover/soon:opacity-100 motion-reduce:transition-none";

/**
 * A link whose target is not ready yet, wherever it sits: disabled, and it
 * looks it, at half opacity with muted text. Hovering it, focusing it or, on a
 * touch screen, tapping it shows a "Coming soon" tooltip, which is its
 * description rather than part of its name. It takes focus so a keyboard can
 * reach that tooltip; the tooltip itself never takes a click.
 */
export function SoonLink({ link, wrapClassName, className, tipClassName, children }: SoonLinkProps) {
  const tipId = useId();
  return (
    <span className={`group/soon relative ${wrapClassName}`}>
      <a {...anchorProps(link)} tabIndex={0} aria-describedby={tipId} className={`${className} ${disabled}`}>
        {children}
      </a>
      <span id={tipId} role="tooltip" className={`${bubble} ${tipClassName}`}>
        {comingSoon}
      </span>
    </span>
  );
}
