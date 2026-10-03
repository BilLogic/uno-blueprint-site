import { links } from "./links";

export type CanvasTab = "understand" | "check" | "present";

export const canvas = {
  headline: "Canvas for your team.",
  subheadline:
    "One blueprint for the whole service. Read it to get up to speed, edit it to keep it current, present it to bring others along.",
  more: { label: "Try the demo", link: links.demo },
  tabsLabel: "What your team does on the canvas",
  tabs: [
    {
      value: "understand",
      label: "Understand the service",
      caption: "See how the whole service runs, step by step, without reading forty docs or the code.",
    },
    {
      value: "check",
      label: "Check and correct",
      caption: "Open a cell, read it against its sources, and fix it in place. The map stays true.",
    },
    {
      value: "present",
      label: "Present a view",
      caption: "Cut the blueprint down to what one audience cares about, and walk them through it.",
    },
  ],
  understand: {
    phasesTitle: "Phases",
    /** The first phase is the one open on the board. */
    phases: ["01 · Intake", "02 · Repair", "03 · Pick-up"],
    pathsTitle: "Paths",
    paths: ["Walk-in", "Online booking"],
  },
  check: {
    /** The step opened in the side panel, which has no owner yet. */
    step: "Repair done",
    /** What the reader is typing into the empty owner field, caret and all. */
    draft: "Lead technician ▍",
  },
  present: {
    title: "Repair intake, for the exec",
    /** The user lane cut down to the steps an exec cares about; the third is the one being presented. */
    steps: ["Books a slot", "Technician diagnoses", "Quote approved", "Picks up"],
    current: 2,
    notes: ["Most repairs wait on quote approval, a phone call today", "Pick-up has no owner yet"],
    slicesTitle: "Slices",
    /** The first slice is the one open. */
    slices: ["For the exec", "For a new hire", "For the client"],
  },
} as const satisfies {
  tabs: readonly { value: CanvasTab; label: string; caption: string }[];
  [key: string]: unknown;
};
