import { links, type SiteLink } from "./links";

/** A nav item; its link may not be ready yet. */
type NavLink = { label: string; link: SiteLink };

const navLinks: readonly NavLink[] = [
  { label: "Demo", link: links.demo },
  { label: "Case study", link: links.caseStudy },
];

export const nav = {
  brand: "Uno Blueprint",
  linksLabel: "Main",
  links: navLinks,
  github: { label: "Uno Blueprint on GitHub", link: links.github },
} as const;
