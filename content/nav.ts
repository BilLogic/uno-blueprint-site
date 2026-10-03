import { links } from "./links";

export const nav = {
  brand: "Uno Blueprint",
  linksLabel: "Main",
  links: [
    { label: "Demo", link: links.demo },
    { label: "Case study", link: links.caseStudy },
  ],
  github: { label: "Uno Blueprint on GitHub", link: links.github },
} as const;
