import type { SiteLink } from "@/content/links";

type AnchorProps = { href: string } | { role: "link"; "aria-disabled": true };

/**
 * A link whose target does not exist yet is inert in every build: no href, so
 * it cannot be followed, and announced as disabled. Every link on the page
 * takes its attributes from here, so `notReady` means the same thing everywhere.
 */
export function anchorProps(link: SiteLink): AnchorProps {
  return link.notReady ? { role: "link", "aria-disabled": true } : { href: link.href };
}
