import { links, type SiteLink } from "./links";

export type CanvasTab = "understand" | "check" | "compare" | "present";

type Canvas = {
  headline: string;
  subheadline: string;
  more: { label: string; link: SiteLink };
  tabsLabel: string;
  /** Each tab plays a screen recording, named by its file under public/videos. */
  tabs: readonly { value: CanvasTab; label: string; caption: string; recording: string }[];
};

export const canvas = {
  headline: "Canvas for your team.",
  subheadline:
    "See how your whole service works, keep it accurate together, weigh one path against another, and tailor it for every stakeholder.",
  more: { label: "Try the demo", link: links.demo },
  tabsLabel: "What your team does on the canvas",
  tabs: [
    {
      value: "understand",
      label: "Get up to speed",
      caption: "New to the service? See it end to end, then open any step for the detail.",
      recording: "canvas-understand",
    },
    {
      value: "check",
      label: "Keep it current",
      caption: "Something out of date? Check it against its source and fix it in place.",
      recording: "canvas-check",
    },
    {
      value: "compare",
      label: "Compare paths",
      caption: "Weighing the options? Line up a scenario's paths and see how the journey, and the work behind it, differ.",
      recording: "canvas-compare",
    },
    {
      value: "present",
      label: "Tailor it",
      caption: "Need stakeholders aligned? Cut the map down to what each one needs, and walk them through it.",
      recording: "canvas-present",
    },
  ],
} as const satisfies Canvas;
