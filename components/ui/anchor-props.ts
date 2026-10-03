import type { SiteLink } from "@/content/links";

type AnchorProps = { href: string } | { role: "link"; "aria-disabled": true };

/**
 * A link whose target does not exist yet is inert in production: no href, so
 * it cannot be followed, and announced as disabled. In development it keeps its
 * placeholder href so the page can be clicked through.
 */
export function anchorProps(link: SiteLink): AnchorProps {
  if (link.notReady && process.env.NODE_ENV === "production") {
    return { role: "link", "aria-disabled": true };
  }
  return { href: link.href };
}
