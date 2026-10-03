export type TouchPointTab = "app" | "agent" | "chat";

/** How a terminal line is coloured: the command, a progress note, a result, a warning. */
export type TerminalTone = "command" | "muted" | "plain" | "warn";

export const touchPoints = {
  headlineLead: "One blueprint.",
  headline: "Every place you work.",
  subheadline: "People and agents get the same answer, wherever they ask.",
  tabsLabel: "Where agents reach the blueprint",
  tabs: [
    {
      value: "app",
      label: "In the app",
      caption: "Ask the built-in agent and watch it point at the blueprint. Bring your own model key.",
    },
    {
      value: "agent",
      label: "With your coding agent",
      caption: "Run the four skills from Claude Code, Cursor, or any agent that reads markdown.",
    },
    {
      value: "chat",
      label: "In your team Slack",
      caption:
        "Put a bot on the same blueprint, and answers arrive where the questions are asked. You build this one; the template does not ship it.",
    },
  ],
  app: {
    question: "What happens after drop-off?",
    /** The answer, with the two steps it cites as numbered tags. */
    answer: [
      { text: "A technician diagnoses it within a day ", cite: "1" },
      { text: ", then the desk calls with a quote ", cite: "2" },
      { text: "." },
    ],
    gap: "Approval by text isn't mapped",
  },
  agent: {
    lines: [
      { text: "› /ub:whatif users book online", tone: "command" },
      { text: "Reading the blueprint…", tone: "muted" },
      { text: "4 steps change", tone: "plain" },
      { text: "Nothing applied until you sign off", tone: "warn" },
    ],
  },
  chat: {
    channel: "# repair-desk",
    messages: [
      { author: "Dana", text: "who owns pick-up after a repair?" },
      {
        author: "Blueprint bot",
        text: "Nobody yet. “Picks up” has no owner on the map.",
        link: "Open the step",
        bot: true,
      },
      { author: "Dana", text: "thanks, adding it to Thursday's agenda." },
    ],
    /** The step the bot's link opens. */
    step: "Picks up",
  },
} as const satisfies {
  tabs: readonly { value: TouchPointTab; label: string; caption: string }[];
  agent: { lines: readonly { text: string; tone: TerminalTone }[] };
  [key: string]: unknown;
};
