import type { ShowcaseTab } from "@/lib/recording";

export type TouchPointTab = "app" | "agent" | "chat" | "phone";

type TouchPoints = {
  headlineLead: string;
  headline: string;
  subheadline: string;
  tabsLabel: string;
  /**
   * Each tab plays a screen recording. The phone's is masked to the handset,
   * and zooms in on what is happening and back out.
   */
  tabs: readonly ShowcaseTab<TouchPointTab>[];
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
      masked: true,
      // Each pair of equal keyframes is a hold; the moves between them ease in
      // and out. The recording runs 23.1 s.
      zoom: [
        // The landing page, whole.
        { at: 0, scale: 1, x: 0.5, y: 0.5 },
        { at: 1.2, scale: 1, x: 0.5, y: 0.5 },
        // The board loads.
        { at: 1.8, scale: 1.7, x: 0.5, y: 0.6 },
        { at: 3.6, scale: 1.7, x: 0.5, y: 0.6 },
        // The navigation sidebar is open.
        { at: 4, scale: 1.7, x: 0.5, y: 0.3 },
        { at: 4.9, scale: 1.7, x: 0.5, y: 0.3 },
        // The Employment & Access board.
        { at: 5.2, scale: 1.6, x: 0.5, y: 0.42 },
        { at: 8.3, scale: 1.6, x: 0.5, y: 0.42 },
        // Out, as the step's detail sheet rises.
        { at: 8.8, scale: 1, x: 0.5, y: 0.5 },
        // The detail sheet.
        { at: 9.4, scale: 1.7, x: 0.5, y: 0.68 },
        { at: 10.8, scale: 1.7, x: 0.5, y: 0.68 },
        // Back to the board, then the agent sheet rises.
        { at: 11.3, scale: 1, x: 0.5, y: 0.5 },
        { at: 12.9, scale: 1, x: 0.5, y: 0.5 },
        // The prompt being typed, then the agent's reply.
        { at: 13.6, scale: 1.75, x: 0.5, y: 0.55 },
        { at: 18.6, scale: 1.75, x: 0.5, y: 0.55 },
        // The board jumps to Discovery; whole again, so the loop meets its start.
        { at: 19.2, scale: 1, x: 0.5, y: 0.5 },
      ],
    },
  ],
} as const satisfies TouchPoints;
