import type { SiteLink } from "@/content/links";
import { anchorProps } from "./anchor-props";

type SectionHeadProps = {
  /** An optional first line of the headline, in the muted colour. */
  lead?: string;
  headline: string;
  subheadline: string;
  /** A link at the far side; on a phone it drops under the sub-headline. */
  more?: { label: string; link: SiteLink };
  className?: string;
};

/** A section's headline and sub-headline, with an optional link beside them. */
export function SectionHead({ lead, headline, subheadline, more, className = "" }: SectionHeadProps) {
  return (
    <div
      className={`flex items-end justify-between gap-6 max-md:flex-col max-md:items-start max-md:gap-3.5 ${className}`}
    >
      <div className="grid gap-4">
        <h2 className="max-w-title text-title text-balance">
          {lead && <span className="block text-muted">{lead}</span>}
          {headline}
        </h2>
        <p className="max-w-lead text-pretty text-muted">{subheadline}</p>
      </div>
      {/* Padded to a 24 px tap target, and pulled back by as much, so it sits where its text would. */}
      {more && (
        <a
          {...anchorProps(more.link)}
          className="-my-0.5 py-0.5 text-14 whitespace-nowrap text-ink underline underline-offset-3"
        >
          {more.label}
        </a>
      )}
    </div>
  );
}
