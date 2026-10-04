import type { Marks } from "./repair-board";

export type TouchPointTab = "app" | "agent" | "chat";

/** How a terminal line is coloured: the command, a progress note, a result, a warning. */
export type TerminalTone = "command" | "muted" | "plain" | "warn";

type TouchPoints = {
  headlineLead: string;
  headline: string;
  subheadline: string;
  tabsLabel: string;
  tabs: readonly { value: TouchPointTab; label: string; caption: string }[];
  app: {
    question: string;
    answer: readonly { text: string; cite?: string }[];
    gap: string;
    marks: Marks;
  };
  agent: { marks: Marks; lines: readonly { text: string; tone: TerminalTone }[] };
  chat: {
    channel: string;
    messages: readonly (
      | { kind: "person"; author: string; text: string }
      | { kind: "bot"; author: string; text: string; link: string }
    )[];
    step: string;
  };
};

export const touchPoints = {
  headlineLead: "One blueprint.",
  headline: "Every place you work.",
  subheadline: "Open it in the app, call it from your coding agent, or bring it into team chat. It plugs into the way your team already works.",
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
    /** The two steps the answer cites, lit on the board. */
    marks: { "Technician diagnoses": "hi", "Quote approved": "hi" },
  },
  agent: {
    /** The step the what-if adds, and the steps it changes. */
    marks: {
      "Books a slot": "hi",
      "Drops off the device": "warn",
      "Technician diagnoses": "warn",
      "Front desk logs it": "warn",
    },
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
      { kind: "person", author: "Dana", text: "who owns pick-up after a repair?" },
      {
        kind: "bot",
        author: "Blueprint bot",
        text: "Nobody yet. “Picks up” has no owner on the map.",
        link: "Open the step",
      },
      { kind: "person", author: "Dana", text: "thanks, adding it to Thursday's agenda." },
    ],
    /** The step the bot's link opens. */
    step: "Picks up",
  },
} as const satisfies TouchPoints;
