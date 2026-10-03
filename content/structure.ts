/** How the work is structured: services down to one cell, read one step at a time as the page scrolls. */
export const structure = {
  heading: { lead: "Your context is everywhere.", main: "Your agents need a map." },
  sub: "MCP connects agents to your tools. Uno Blueprint shows them what lives where, and how it connects.",
  /** Each step's caption, and how much scrolling it gets in viewport heights. */
  steps: [
    { title: "Services", caption: "Start with everything you run. One workspace holds one service, or all of them.", scroll: 40 },
    { title: "Phases", caption: "Each service runs in phases: the big stages a user moves through, in order.", scroll: 40 },
    { title: "Scenarios", caption: "Each phase holds scenarios: the situations that come up.", scroll: 40 },
    { title: "Paths", caption: "A scenario can play out in more than one way. Each path is its own blueprint.", scroll: 46 },
    { title: "Blueprint", caption: "Pick a path and you are looking at one blueprint: who does what, and when.", scroll: 70 },
    { title: "User", caption: "What the person you serve does, step by step: each action, choice and wait, from their side.", scroll: 36 },
    { title: "Line of interaction", caption: "Where the user and your service meet. Every exchange between them crosses this line.", scroll: 30 },
    { title: "Frontstage", caption: "Who and what they meet: the teammate or agent who responds, and the screens, messages and products they touch.", scroll: 36 },
    { title: "Line of visibility", caption: "Everything above it, the user can see. Everything below it happens out of their view.", scroll: 30 },
    { title: "Backstage", caption: "The work that makes the frontstage possible: preparing, checking, deciding, fixing. Users feel its results without seeing it.", scroll: 36 },
    { title: "Line of internal interaction", caption: "Separates the people doing the work from the systems and partners that support them.", scroll: 30 },
    { title: "Support", caption: "The systems, data and partners your team relies on to do that work.", scroll: 36 },
    { title: "Steps", caption: "Each column is one moment of the journey, read left to right.", scroll: 42 },
    { title: "Cells", caption: "Where a lane meets a step: one action, by one actor, at one moment.", scroll: 46 },
    { title: "Inside a cell", caption: "Each cell carries its owner, its status, its value, what it leads to, and the evidence behind it.", scroll: 120 },
  ],
  /** The labels beside the stack, one per sheet and one for the paths below them. */
  stackTags: ["Services", "Phases", "Scenarios", "Paths"],
  board: {
    crumbs: ["Service", "Phase", "Scenario"],
    path: "Path 1",
    lanes: ["User", "Frontstage", "Backstage", "Support"],
    lines: ["Line of interaction", "Line of visibility", "Line of internal interaction"],
  },
  panel: {
    summary: "Summary",
    status: "Status",
    live: "Live",
    owner: "Owner",
    value: "Value proposition",
    tabs: ["Evidence", "Dependencies", "Resources"],
    follows: "Follows",
    leadsTo: "Leads to",
  },
} as const;
