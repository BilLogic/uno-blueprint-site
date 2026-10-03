export const bento = {
  /**
   * A heading for screen readers while the bento stands on its own; inside the
   * structure section that section's own heading leads into the panels instead.
   */
  heading: "What the structure gives you",
  duo: {
    title: "Uno map, duo users",
    body: "People work on the canvas. Agents work on the same blueprint as structured data. One map, two ways in.",
    /**
     * The cell as an agent reads it, one line per field: [indent, key, rest].
     * On a phone the last line folds to `folded`.
     */
    json: [
      ["{ ", '"lane"', ': "front",'],
      ["  ", '"step"', ": 3,"],
      ["  ", '"status"', ': "live",'],
      ["  ", '"leads_to"', ': ["step-4"] }'],
    ],
    folded: "  … }",
  },
  rag: {
    title: "Built for RAG",
    body: "Every cell is a typed row in Postgres. Agents pull only the cells and evidence a question needs, and answer with sources. Add a vector index for semantic search.",
    question: "“who approves a refund?”",
  },
  scale: {
    title: "Uno team or every team",
    body: "One flow for a small team. Every service for a whole organization. The structure stays the same.",
  },
  context: {
    title: "Product context, built in",
    body: "Owner, status, value and dependencies live on every cell.",
    /** The cell's status before and while the picture plays. */
    status: ["Planned", "Live"],
  },
  sources: {
    title: "Sources stay attached",
    body: "Every cell links to the doc, design or thread behind it.",
    tools: ["Notion", "Figma", "Slack"],
  },
} as const;
