export type SiteLink = {
  href: string;
  /** The target does not exist yet. `grep -rn "notReady: true" content` lists what to fill before launch. */
  notReady?: true;
};

/** What a button or nav item whose target is not ready yet says, in a tooltip, when it is hovered or focused. */
export const comingSoon = "Coming soon";

export const links = {
  demo: { href: "https://uno-blueprint.netlify.app/demo/" },
  github: { href: "https://github.com/BilLogic/uno-blueprint" },
  getStarted: { href: "#start" },
  caseStudy: { href: "#", notReady: true },
  billGuo: { href: "#bill-linkedin", notReady: true },
  meryemMarasli: { href: "#meryem-linkedin", notReady: true },
  plusBlueprint: { href: "https://plus-uno.netlify.app/blueprint/" },
  // Where each voice in the ideas timeline said it.
  shostackSource: { href: "https://hbr.org/1984/01/designing-services-that-deliver" },
  polaineSource: { href: "https://rosenfeldmedia.com/books/service-design-from-insight-to-implementation/" },
  gibbonsSource: { href: "https://www.nngroup.com/articles/service-blueprints-definition/" },
  lutkeSource: { href: "https://x.com/tobi/status/1935533422589399127" },
  schmidSource: { href: "https://www.philschmid.de/context-engineering" },
  lopopoloSource: { href: "https://openai.com/index/harness-engineering/" },
  hashimotoSource: { href: "https://mitchellh.com/writing/my-ai-adoption-journey" },
  karpathySource: { href: "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f" },
  bockelerSource: {
    href: "https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html",
  },
} as const satisfies Record<string, SiteLink>;
