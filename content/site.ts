import { links } from "./links";

/** How the page describes itself to search engines, link previews and answer engines. */
export const site = {
  name: "Uno Blueprint",
  url: "https://uno-blueprint.netlify.app",
  /** The browser tab and the search result's headline. */
  title: "Uno Blueprint: open-source toolkit for context engineering",
  /** The search result's snippet; it says nothing the page does not. */
  description:
    "Open-source toolkit for context engineering. Map how your service works as a blueprint your team edits and your agents read, with four skills, on top of MCP.",
  /** What a shared link shows. Its picture's alt text is app/opengraph-image.alt.txt. */
  share: {
    title: "Uno Blueprint: get your human and AI teammates on the same page",
    description: "A canvas for your team, a harness for your agents. Open source.",
  },
  /** The code behind the toolkit, as structured data describes it. */
  source: {
    repository: links.github.href,
    language: "TypeScript",
    license: "https://opensource.org/licenses/MIT",
    authors: ["Bill Guo", "Meryem Marasli"],
  },
  /**
   * Crawlers the site welcomes by name, answer engines included, so a blanket
   * rule elsewhere never shuts them out. Every other crawler is welcome too.
   */
  crawlers: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web", "PerplexityBot", "Google-Extended"],
} as const;
