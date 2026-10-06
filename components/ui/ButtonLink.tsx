import type { SiteLink } from "@/content/links";
import { anchorProps } from "./anchor-props";
import { SoonLink } from "./SoonLink";

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

/** A not-ready button's frame, whatever its variant: muted text on the primary colour does not read. */
const disabledFrame = "border-line-2 bg-panel";

/**
 * A link styled as a button. One whose target is not ready yet is disabled, as
 * every such link is, and says so in its label, which is its `soonLabel` (the
 * case card's "Case study coming soon"). Whatever its variant, it takes the
 * plain frame, faded, with muted text and no hover. Setting the real href and
 * dropping `notReady` makes it live.
 */
export function ButtonLink({ link, variant, children, soonLabel }: ButtonLinkProps) {
  if (link.notReady) {
    return (
      <SoonLink
        link={link}
        wrapClassName="inline-flex"
        className={`${base} ${disabledFrame}`}
        tipClassName="top-full mt-1.5"
      >
        {soonLabel ?? children}
      </SoonLink>
    );
  }
  return (
    <a {...anchorProps(link)} className={`${base} ${variants[variant]}`}>
      {children}
    </a>
  );
}
