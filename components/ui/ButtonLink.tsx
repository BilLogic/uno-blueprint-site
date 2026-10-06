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

/** Each variant's frame, its text when live, and what it does on hover when live. */
const variants = {
  primary: { frame: "border-transparent bg-primary", text: "text-on-primary", hover: "hover:bg-primary-hover" },
  ghost: { frame: "border-line-2 bg-panel", text: "text-ink", hover: "hover:border-line-hot" },
} as const;

/**
 * A link styled as a button. One whose target is not ready yet is disabled, as
 * every such link is, and says so in its label, which is its `soonLabel` (the
 * case card's "Case study coming soon"). Whatever its variant, it takes the
 * plain frame, faded, with muted text and no hover: muted text on the primary
 * colour does not read. Setting the real href and dropping `notReady` makes it
 * live.
 */
export function ButtonLink({ link, variant, children, soonLabel }: ButtonLinkProps) {
  if (link.notReady) {
    return (
      <SoonLink
        link={link}
        wrapClassName="inline-flex"
        className={`${base} ${variants.ghost.frame}`}
        tipClassName="top-full mt-1.5"
      >
        {soonLabel ?? children}
      </SoonLink>
    );
  }
  const { frame, text, hover } = variants[variant];
  return (
    <a {...anchorProps(link)} className={`${base} ${frame} ${text} ${hover}`}>
      {children}
    </a>
  );
}
