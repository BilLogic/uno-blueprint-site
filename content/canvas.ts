import { links, type SiteLink } from "./links";
import type { Marks, StepName } from "./repair-board";

export type CanvasTab = "understand" | "check" | "compare" | "present";

type Canvas = {
  headline: string;
  subheadline: string;
  more: { label: string; link: SiteLink };
  tabsLabel: string;
  tabs: readonly { value: CanvasTab; label: string; caption: string }[];
  understand: { phasesTitle: string; phases: readonly string[]; pathsTitle: string; paths: readonly string[] };
  check: { step: string; marks: Marks; draft: string };
  compare: {
    views: readonly [string, string];
    title: string;
    kinds: readonly [string, string];
    walkIn: Readonly<Partial<Record<StepName<"user"> | StepName<"back">, string>>>;
  };
  present: {
    title: string;
    steps: readonly [string, string, string, string];
    marks: Marks;
    notes: readonly string[];
    slicesTitle: string;
    slices: readonly string[];
  };
};

export const canvas = {
  headline: "Canvas for your team.",
  subheadline:
    "See how your whole service works, keep it accurate together, compare the ways it can go, and tailor it for every stakeholder.",
  more: { label: "Try the demo", link: links.demo },
  tabsLabel: "What your team does on the canvas",
  tabs: [
    {
      value: "understand",
      label: "Get up to speed",
      caption: "New to the service? See it end to end, then open any step for the detail.",
    },
    {
      value: "check",
      label: "Keep it current",
      caption: "Something out of date? Check it against its source and fix it in place.",
    },
    {
      value: "compare",
      label: "Compare paths",
      caption:
        "Not everything goes to plan? Set the main route beside its variants and exceptions, and see exactly where they split.",
    },
    {
      value: "present",
      label: "Tailor it",
      caption: "Need stakeholders aligned? Cut the map down to what each one needs, and walk them through it.",
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
    marks: { "Repair done": "gap" },
    /** What the reader is typing into the empty owner field, caret and all. */
    draft: "Lead technician ▍",
  },
  compare: {
    /** One board per path, or one board the paths share; the second is the one open. */
    views: ["Stacked", "Merged"],
    title: "Repair intake, two paths merged",
    /** What kind of path each one is, in the paths' order: walk-in is the main route, online booking a variant. */
    kinds: ["Main route", "Variant"],
    /** Where a walk-in parts from an online booking: its own step in place of the board's. Online booking follows the board. */
    walkIn: { "Books a slot": "Walks in", "Confirms the slot": "Checks the queue" },
  },
  present: {
    title: "Repair intake, for the exec",
    /** The user lane cut down to the steps an exec cares about. */
    steps: ["Books a slot", "Technician diagnoses", "Quote approved", "Picks up"],
    /** The step being presented. */
    marks: { "Quote approved": "hi" },
    notes: ["Most repairs wait on quote approval, a phone call today", "Pick-up has no owner yet"],
    slicesTitle: "Slices",
    /** The first slice is the one open. */
    slices: ["For the exec", "For a new hire", "For the client"],
  },
} as const satisfies Canvas;
