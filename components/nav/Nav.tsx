import { nav } from "@/content/nav";
import { GitHubMark } from "@/components/icons/GitHubMark";
import { Container } from "@/components/ui/Container";
import { anchorProps } from "@/components/ui/anchor-props";
import { SoonLink } from "@/components/ui/SoonLink";
import { ViewSwitch } from "@/components/view/ViewSwitch";
import { Logo } from "./Logo";

const linkClass =
  "flex items-center px-2.5 text-14 leading-none font-medium text-ink transition-[color] duration-t-1 hover:text-brand max-md:px-2 max-md:text-13-5";

const soonClass =
  "flex h-full cursor-not-allowed items-center px-2.5 text-14 leading-none font-medium whitespace-nowrap text-ink max-md:px-2 max-md:text-13-5";

export function Nav() {
  return (
    <header className="sticky top-0 z-5 border-b border-line bg-bg/92 backdrop-blur-nav">
      <Container className="flex h-16 items-center justify-between gap-4 max-xs:gap-2">
        <div className="flex items-center gap-3.5 max-xs:gap-2.5">
          <Logo name={nav.brand} />
          <ViewSwitch />
        </div>
        <div className="flex items-center gap-1 text-14">
          <nav aria-label={nav.linksLabel} className="flex h-16 items-stretch">
            {/* A link whose target is not ready yet is a disabled item in the same look, with "Coming soon" as a tooltip below it. */}
            {nav.links.map(({ label, link }) =>
              link.notReady ? (
                <SoonLink key={label} link={link} side="below" wrapClassName="flex" className={soonClass}>
                  {label}
                </SoonLink>
              ) : (
                <a key={label} {...anchorProps(link)} className={linkClass}>
                  {label}
                </a>
              ),
            )}
          </nav>
          <a
            href={nav.github.link.href}
            aria-label={nav.github.label}
            className="inline-flex h-9 items-center px-2 text-ink transition-[color] duration-t-1 hover:text-brand"
          >
            <GitHubMark className="size-icon" />
          </a>
        </div>
      </Container>
    </header>
  );
}
