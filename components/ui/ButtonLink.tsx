import type { SiteLink } from "@/content/links";
import { anchorProps } from "./anchor-props";
import { SoonLink } from "./SoonLink";

type ButtonLinkProps = {
  link: SiteLink;
  variant: "primary" | "ghost";
  children: string;
};

const base =
  "inline-flex h-9.5 items-center gap-2 rounded-10 border px-4 text-14 leading-none font-medium whitespace-nowrap";

const variants = {
  primary: "border-transparent bg-primary text-on-primary hover:bg-primary-hover",
  ghost: "border-line-2 bg-panel text-ink hover:border-line-hot",
} as const;

const soon = "cursor-not-allowed border-line-2 bg-panel text-muted";

/**
 * A link styled as a button. One whose target is not ready yet is disabled, as
 * every such link is, with its label muted and "Coming soon" as a tooltip.
 * Setting the real href and dropping `notReady` makes it live.
 */
export function ButtonLink({ link, variant, children }: ButtonLinkProps) {
  if (link.notReady) {
    return (
      <SoonLink link={link} side="above" wrapClassName="inline-flex" className={`${base} ${soon}`}>
        {children}
      </SoonLink>
    );
  }
  return (
    <a {...anchorProps(link)} className={`${base} ${variants[variant]}`}>
      {children}
    </a>
  );
}
