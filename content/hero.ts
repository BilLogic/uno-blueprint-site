import { links } from "./links";

/** A source a document comes from. `icon` names its mark in the hero picture. */
export type HeroTool = {
  name: string;
  icon: "notion" | "slack" | "figma" | "github" | "googleDrive" | "zoom" | "mail" | "spreadsheet";
};

export const hero = {
  headline: "Get your human and AI teammates on the same page.",
  subheadline:
    "An open-source toolkit for context engineering: a canvas for your team, a harness for your agents.",
  primary: { label: "Get the template", link: links.getStarted },
  secondary: { label: "Try the demo", link: links.demo },
  picture: {
    label:
      "Documents from Notion, Slack, Figma, GitHub, Google Drive, Zoom, email and spreadsheets pass through Uno Blueprint into the cells of a blueprint. People and agents move from cell to cell, and the cell a person stops on opens in a panel beside it",
    node: "Uno Blueprint",
    /** Two to a row on wide screens, in this order. */
    tools: [
      { name: "Notion", icon: "notion" },
      { name: "Slack", icon: "slack" },
      { name: "Figma", icon: "figma" },
      { name: "GitHub", icon: "github" },
      { name: "Google Drive", icon: "googleDrive" },
      { name: "Zoom", icon: "zoom" },
      { name: "Email", icon: "mail" },
      { name: "Spreadsheets", icon: "spreadsheet" },
    ] satisfies readonly HeroTool[],
    /** The blueprint's lanes, top to bottom. */
    lanes: ["User", "Frontstage", "Backstage", "Support"],
    breadcrumb: { service: "Service", phase: "Phase", scenario: "Scenario", path: "Path" },
    panel: {
      summary: "Summary",
      status: "Status",
      owner: "Owner",
      valueProposition: "Value proposition",
      tabs: ["Evidence", "Dependencies", "Resources"],
      follows: "Follows",
      leadsTo: "Leads to",
      /** The status a cell shows, picked by its position on the board. */
      statuses: ["Live", "Built", "Planned", "Live", "At risk", "Live"],
    },
  },
} as const;
