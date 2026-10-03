export type SiteLink = {
  href: string;
  /** The target does not exist yet. `grep -rn "notReady: true" content` lists what to fill before launch. */
  notReady?: true;
};

export const links = {
  demo: { href: "https://uno-blueprint.netlify.app/demo/" },
  github: { href: "https://github.com/BilLogic/uno-blueprint" },
  getStarted: { href: "#start" },
  caseStudy: { href: "#", notReady: true },
  billGuo: { href: "#bill-linkedin", notReady: true },
  meryemMarasli: { href: "#meryem-linkedin", notReady: true },
} as const satisfies Record<string, SiteLink>;
