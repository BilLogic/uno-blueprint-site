export const bento = {
  duo: {
    title: "Uno map, duo users",
    body: "Your team works on a visual canvas. Your agents query the same blueprint as structured data.",
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
    body: "Agents search every step by meaning, then pull only the ones a question needs.",
    /** Typed into the search box, letter by letter, while the picture plays. */
    question: "Who approves a refund?",
  },
  scale: {
    title: "Scalable structure",
    body: "Map one focused journey for a small project, or every service in a large organization.",
  },
  context: {
    title: "Product context, built in",
    body: "Each step carries what your team tracks: owner, status, value, and dependencies.",
    /** The cell's status before and while the picture plays. */
    status: ["Planned", "Live"],
  },
  sources: {
    title: "Sources stay attached",
    body: "Every step links to its sources, so anyone can trace it back to the PRD, design, or thread behind it.",
    tools: ["Notion", "Figma", "Slack"],
  },
} as const;
