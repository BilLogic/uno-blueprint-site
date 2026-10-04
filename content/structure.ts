/** How the work is structured: a team's scattered context, then services down to one cell, read one step at a time as the page scrolls. */
export const structure = {
  heading: { lead: "Your context is everywhere.", main: "Your agents need a map." },
  sub: "MCP connects your agents to your tools. Uno Blueprint shows them how it all fits together, so they find the right context the first time.",
  /** Each step's caption, and how much scrolling it gets in viewport heights. */
  steps: [
    { title: "Your context", caption: "Your product knowledge is spread across PRDs, designs, code, dashboards and threads.", scroll: 130 },
    { title: "Services", caption: "It all comes together in a service: the whole experience you deliver, end to end. Everything else on the map sits inside it.", scroll: 40 },
    { title: "Phases", caption: "A service unfolds in phases: chapters of the experience, in time order.", scroll: 40 },
    { title: "Scenarios", caption: "Each phase holds scenarios: the specific situations that can happen during it.", scroll: 40 },
    { title: "Paths", caption: "Each scenario has paths: the main route, plus its variants and exceptions.", scroll: 46 },
    { title: "Blueprint", caption: "Open a path to see its blueprint: who does what, step by step, across every lane.", scroll: 70 },
    { title: "User", caption: "The user journey: what the user does, thinks and decides at each step.", scroll: 36 },
    { title: "Line of interaction", caption: "Where the user and your service meet.", scroll: 30 },
    { title: "Frontstage", caption: "The touchpoints the user sees: the people, screens and messages that respond.", scroll: 36 },
    { title: "Line of visibility", caption: "What sits below this line, the user never sees.", scroll: 30 },
    { title: "Backstage", caption: "The work behind the scenes that makes the frontstage possible.", scroll: 36 },
    { title: "Line of internal interaction", caption: "Where your team hands off to the systems and partners behind it.", scroll: 30 },
    { title: "Support", caption: "The tools, data and partners every step relies on.", scroll: 36 },
    { title: "Steps", caption: "Each column is one moment in time, read down every lane at once.", scroll: 42 },
    { title: "Cells", caption: "Where a lane meets a step: what one participant does at one moment.", scroll: 46 },
    { title: "Inside a cell", caption: "Each cell carries the detail: owner, status, value, dependencies and the sources behind it.", scroll: 120 },
  ],
  /**
   * The opening step's six cards, one per place a product team's context
   * lives; each becomes a layer of the stack. `tool` picks the mark.
   */
  context: {
    cards: [
      { tool: "Notion", title: "PRD: Checkout" },
      { tool: "Slack", title: "#support" },
      { tool: "Figma", title: "Checkout flow" },
      { tool: "Linear", title: "Sprint board" },
      { tool: "Mixpanel", title: "Checkout funnel" },
      { tool: "GitHub", title: "checkout-service" },
    ],
    /** The status on the sprint board's ticket. */
    ticketStatus: "In review",
  },
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
