import type { SiteLink } from "@/content/links";
import { anchorProps } from "./anchor-props";

type ButtonLinkProps = {
  link: SiteLink;
  variant: "primary" | "ghost";
  children: string;
};

const variants = {
  primary: "border-transparent bg-primary text-on-primary hover:bg-primary-hover",
  ghost: "border-line-2 bg-panel text-ink hover:border-line-hot",
} as const;

export function ButtonLink({ link, variant, children }: ButtonLinkProps) {
  return (
    <a
      {...anchorProps(link)}
      className={`inline-flex h-9.5 items-center gap-2 rounded-10 border px-4 text-14 leading-none font-medium whitespace-nowrap ${variants[variant]}`}
    >
      {children}
    </a>
  );
}
