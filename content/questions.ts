export const questions = {
  title: "Uno more thing.",
  list: [
    {
      question: "Why “Uno”?",
      answer: "Uno means one. One map of the service, for people and agents both.",
    },
    {
      question: "How is this different from MCP?",
      answer:
        "MCP lets an agent reach your tools. Uno Blueprint gives it a map of what lives in them and how it fits together. It works on top of MCP, not instead of it.",
    },
    {
      question: "What is a service blueprint?",
      answer:
        "One map of how a service runs: each step your user takes, what the team and systems do behind it, and who owns each part.",
    },
    {
      question: "Is it a journey management tool?",
      answer:
        "No. Tools such as TheyDo, Smaply, Cemantica, and JourneyTrack manage customer journeys across a portfolio. Uno Blueprint maps how your services run, from what the customer sees to the work behind it, for your team and your agents. It's open source, so you can shape it to fit your team, and it can sit beside the tool you already use.",
    },
    {
      question: "Do we have to move our docs into it?",
      answer: "No. Your docs stay in their tools. The blueprint organizes what they hold and links back.",
    },
    {
      question: "Can we bring a blueprint we already have?",
      answer:
        "Yes. Hand your agent a FigJam, Figma, or Miro board, or a spreadsheet. It translates it into a blueprint for you to check and sign off.",
    },
    {
      question: "Does my data become public?",
      answer: "No. The code is open source; your blueprint lives in your own database.",
    },
    {
      question: "Does the agent change things on its own?",
      answer: "No. Agents draft, check, and suggest. Drafts need sign-off, and every edit can be undone.",
    },
    {
      question: "Which agents can use it?",
      answer:
        "The agent built into the app, and coding agents such as Claude Code, Cursor, and Codex, which run the four skills. Any one of them is enough, and any agent can read a published blueprint.",
    },
  ],
} as const;
