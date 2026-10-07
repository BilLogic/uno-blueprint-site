import type { StaticImageData } from "next/image";
import { links, type SiteLink } from "./links";
import plusMark from "@/public/images/plus-mark.png";
import plusBlueprint from "@/public/images/plus-blueprint.jpg";
import andrejKarpathy from "@/public/images/voices/andrej-karpathy.jpg";
import andyPolaine from "@/public/images/voices/andy-polaine.jpg";
import benReason from "@/public/images/voices/ben-reason.jpg";
import birgittaBockeler from "@/public/images/voices/birgitta-bockeler.jpg";
import lavransLovlie from "@/public/images/voices/lavrans-lovlie.jpg";
import mitchellHashimoto from "@/public/images/voices/mitchell-hashimoto.jpg";
import philippSchmid from "@/public/images/voices/philipp-schmid.jpg";
import ryanLopopolo from "@/public/images/voices/ryan-lopopolo.jpg";
import sarahGibbons from "@/public/images/voices/sarah-gibbons.jpg";
import tobiLutke from "@/public/images/voices/tobi-lutke.jpg";

/**
 * Whether the page may show a person's portrait. Only a portrait with a
 * recorded permission or licence is shown; everyone else gets initials.
 */
export type Portrait =
  | { status: "not cleared" }
  | { status: "cleared"; src: StaticImageData; basis: string };

/** A quote as runs of text; the marked runs are the words that carry it. */
export type Quote = readonly (string | { mark: string })[];

export type Voice = {
  name: string;
  role: string;
  /** Where and when it was said; shown when the pointer rests on the card. */
  source: string;
  date: string;
  field: "Service design" | "Context engineering" | "Harness engineering";
  quote: Quote;
  link: SiteLink;
  portrait: Portrait;
  /** Anyone who said it alongside the named voice; their portraits sit behind its own. */
  coauthors?: readonly { name: string; portrait: Portrait }[];
};

const notCleared: Portrait = { status: "not cleared" };

/** A public profile photo, shown because the site owner chose to show it. */
const publicPhoto = "Public profile photo, used at the site owner's discretion";

export const ideas = {
  headline: "Ideas we build on.",
  sub: "Uno Blueprint sits where service design meets context and harness engineering.",
  /** Oldest first, alternating left and right of the line. */
  voices: [
    {
      name: "G. Lynn Shostack",
      role: "Originator of the service blueprint",
      source: "Designing Services That Deliver, Harvard Business Review, 1984",
      date: "1984",
      field: "Service design",
      quote: [
        "A blueprint is more precise than verbal definitions and ",
        { mark: "less subject to misinterpretation." },
      ],
      link: links.shostackSource,
      portrait: notCleared,
    },
    {
      name: "Andy Polaine et al.",
      role: "Service Design: From Insight to Implementation",
      source: "Rosenfeld Media, 2013",
      date: "2013",
      field: "Service design",
      quote: [
        "It is because ",
        { mark: "many services are almost invisible" },
        " that nobody takes care to design them.",
      ],
      link: links.polaineSource,
      portrait: { status: "cleared", src: andyPolaine, basis: "polaine.com headshots, publicity use" },
      coauthors: [
        { name: "Lavrans Løvlie", portrait: { status: "cleared", src: lavransLovlie, basis: publicPhoto } },
        { name: "Ben Reason", portrait: { status: "cleared", src: benReason, basis: publicPhoto } },
      ],
    },
    {
      name: "Sarah Gibbons",
      role: "Nielsen Norman Group",
      source: "Service Blueprints: Definition, Aug 2017",
      date: "2017",
      field: "Service design",
      quote: ["Blueprints are ", { mark: "treasure maps" }, " that help businesses discover weaknesses."],
      link: links.gibbonsSource,
      portrait: { status: "cleared", src: sarahGibbons, basis: publicPhoto },
    },
    {
      name: "Tobi Lütke",
      role: "CEO, Shopify",
      source: "on X, Jun 2025",
      date: "Jun 2025",
      field: "Context engineering",
      quote: [
        "I really like the term “context engineering” over prompt engineering. It describes the core skill better: ",
        { mark: "the art of providing all the context for the task to be plausibly solvable by the LLM." },
      ],
      link: links.lutkeSource,
      portrait: {
        status: "cleared",
        src: tobiLutke,
        // The licence asks for a credit, which the footer gives.
        basis: "CC BY-SA 4.0, Benjamin Forrest, Wikimedia Commons",
      },
    },
    {
      name: "Philipp Schmid",
      role: "AI Developer Experience, Google DeepMind",
      source: "The New Skill in AI Is Context Engineering, Jun 2025",
      date: "Jun 2025",
      field: "Context engineering",
      quote: ["Most agent failures are not model failures anymore, ", { mark: "they are context failures." }],
      link: links.schmidSource,
      portrait: { status: "cleared", src: philippSchmid, basis: publicPhoto },
    },
    {
      name: "Ryan Lopopolo",
      role: "Member of the Technical Staff, OpenAI",
      source: "Harness engineering, Feb 2026",
      date: "Feb 2026",
      field: "Harness engineering",
      quote: [
        "One of the earliest lessons we learned was simple: ",
        { mark: "give Codex a map, not a 1,000-page instruction manual." },
      ],
      link: links.lopopoloSource,
      portrait: { status: "cleared", src: ryanLopopolo, basis: publicPhoto },
    },
    {
      name: "Mitchell Hashimoto",
      role: "Co-founder, HashiCorp",
      source: "My AI Adoption Journey, Feb 2026",
      date: "Feb 2026",
      field: "Harness engineering",
      quote: [
        "It is the idea that anytime you find an agent makes a mistake, ",
        {
          mark: "you take the time to engineer a solution such that the agent never makes that mistake again.",
        },
      ],
      link: links.hashimotoSource,
      portrait: { status: "cleared", src: mitchellHashimoto, basis: publicPhoto },
    },
    {
      name: "Andrej Karpathy",
      role: "Co-founder, OpenAI",
      source: "llm-wiki, Apr 2026",
      date: "Apr 2026",
      field: "Context engineering",
      quote: [
        {
          mark: "The human's job is to curate sources, direct the analysis, ask good questions, and think about what it all means.",
        },
        " The LLM's job is everything else.",
      ],
      link: links.karpathySource,
      portrait: { status: "cleared", src: andrejKarpathy, basis: publicPhoto },
    },
    {
      name: "Birgitta Böckeler",
      role: "Distinguished Engineer, Thoughtworks",
      source: "Harness engineering for coding agent users, Apr 2026",
      date: "Apr 2026",
      field: "Harness engineering",
      quote: [
        "A good harness should not necessarily aim to fully eliminate human input, but to ",
        { mark: "direct it to where our input is most important" },
        ".",
      ],
      link: links.bockelerSource,
      portrait: { status: "cleared", src: birgittaBockeler, basis: publicPhoto },
    },
  ],
  plus: {
    mark: { src: plusMark, name: "PLUS" },
    title: "PLUS Uno Blueprint",
    body: "A tutoring program on one blueprint, from a tutor's application to the session and after.",
    // While the case study is not ready, the button says so in its label.
    primary: { label: "Read the case study", soonLabel: "Case study coming soon", link: links.caseStudy },
    secondary: { label: "See the PLUS blueprint", link: links.plusBlueprint },
    screenshot: {
      src: plusBlueprint,
      alt: "The PLUS blueprint open on its Discovery scenario, with one cell's detail panel showing",
    },
  },
} as const satisfies { headline: string; sub: string; voices: readonly Voice[]; plus: unknown };
