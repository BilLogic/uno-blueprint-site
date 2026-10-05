export type TouchPointTab = "app" | "agent" | "chat" | "phone";

type TouchPoints = {
  headlineLead: string;
  headline: string;
  subheadline: string;
  tabsLabel: string;
  /** Each tab plays a screen recording, named by its file under public/videos. */
  tabs: readonly { value: TouchPointTab; label: string; caption: string; recording: string }[];
};

export const touchPoints = {
  headlineLead: "One blueprint.",
  headline: "Every place you work.",
  subheadline: "Open it in the app or on your phone, call it from your coding agent, or bring it into team chat. It plugs into the way your team already works.",
  tabsLabel: "Where agents reach the blueprint",
  tabs: [
    {
      value: "app",
      label: "In the app",
      caption: "Ask the built-in agent and watch it point at the blueprint. Bring your own model key.",
      recording: "touch-app",
    },
    {
      value: "agent",
      label: "With your coding agent",
      caption: "Run the four skills from Claude Code, Cursor, or any agent that reads markdown.",
      recording: "touch-agent",
    },
    {
      value: "chat",
      label: "In your team Slack",
      caption:
        "Put a bot on the same blueprint, and answers arrive where the questions are asked. You build this one; the template does not ship it.",
      recording: "touch-chat",
    },
    {
      value: "phone",
      label: "On your phone",
      caption: "Take the blueprint with you. Read any journey and jump to any step.",
      recording: "touch-phone",
    },
  ],
} as const satisfies TouchPoints;
