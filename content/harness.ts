import { links } from "./links";

export type SkillId = "map" | "slice" | "audit" | "whatif";
export type LaneId = "user" | "front" | "back" | "support";
export type SourceId = "figma" | "slack" | "notion" | "zoom" | "drive";

/** The four lanes every picture draws, top to bottom. */
export const lanes: readonly { id: LaneId; name: string }[] = [
  { id: "user", name: "User" },
  { id: "front", name: "Frontstage" },
  { id: "back", name: "Backstage" },
  { id: "support", name: "Support" },
];

/**
 * Which cells of the small six-step board hold something, lane by lane. An
 * empty cell stays empty whatever a picture does to the board.
 */
export const occupied: readonly (readonly boolean[])[] = [
  [true, true, true, false, true, true],
  [true, true, true, true, false, true],
  [false, true, true, true, true, true],
  [true, true, false, true, true, false],
];

/** A line of a source document: a grey bar of some width (%), or a phrase the skill reads. */
type DocPart = { bar: number } | { phrase: number; text: string };

export const map = {
  sources: "Your existing context",
  result: "Your blueprint",
  done: "Draft, waiting for your sign-off",
  /** Five documents, each with a title bar (% of the row) and a line holding the phrases. */
  docs: [
    { source: "figma", title: 34, line: [{ bar: 22 }, { phrase: 0, text: "drops off the device" }, { bar: 30 }] },
    { source: "slack", title: 26, line: [{ bar: 30 }, { phrase: 1, text: "call with a quote" }, { bar: 18 }] },
    {
      source: "notion",
      title: 40,
      line: [{ bar: 14 }, { phrase: 2, text: "logs the device" }, { bar: 10 }, { phrase: 3, text: "tags it" }, { bar: 14 }],
    },
    { source: "zoom", title: 30, line: [{ bar: 20 }, { phrase: 4, text: "diagnoses the fault" }, { bar: 24 }] },
    { source: "drive", title: 28, line: [{ bar: 16 }, { phrase: 5, text: "parts inventory" }, { bar: 30 }] },
  ] satisfies readonly { source: SourceId; title: number; line: readonly DocPart[] }[],
  /** Phrase n lands in this lane and step (0 drop-off, 1 diagnosis, 2 quote) as this cell. */
  placements: [
    { lane: 0, step: 0, text: "Drops off the device" },
    { lane: 1, step: 2, text: "Calls with a quote" },
    { lane: 1, step: 0, text: "Logs the device" },
    { lane: 2, step: 0, text: "Tags the device" },
    { lane: 2, step: 1, text: "Diag\u00adnoses the fault" },
    { lane: 3, step: 1, text: "Parts inventory" },
  ],
  /**
   * The order the phrases are read in: everything at drop-off first, then the
   * quote, then the diagnosis that belongs between them and the system it leans on.
   */
  readOrder: [0, 2, 3, 1, 4, 5],
} as const;

export const slice = {
  sources: "Pick a slice",
  result: "What it takes",
  kinds: [
    { id: "journey", label: "Journey" },
    { id: "lane", label: "Lane" },
    { id: "step", label: "Step" },
    { id: "cell", label: "Cell" },
    { id: "custom", label: "Custom" },
  ],
} as const;

export const audit = {
  sources: "Your blueprint",
  result: "What to fix first",
  doFirst: "Do first",
  impact: "Impact",
  effort: "Effort",
  /** Cells the scan flags as it passes, with the second it reaches each one. */
  flags: [
    { lane: 1, step: 0, kind: "warn", at: 0.35 },
    { lane: 1, step: 3, kind: "warn", at: 1.05 },
    { lane: 0, step: 4, kind: "gap", at: 1.3 },
    { lane: 2, step: 5, kind: "warn", at: 1.5 },
  ],
  /** Each finding's place on the graph (% from the left and top), and whether it is a first priority. */
  findings: [
    { x: 23.8, y: 22, first: true },
    { x: 40, y: 36, first: true },
    { x: 75.4, y: 26, first: false },
    { x: 32.3, y: 68, first: false },
  ],
} as const;

/** How an option changes a cell: removes it, changes it, moves it to a new path, or adds one. */
export type CellChange = "rm" | "ch" | "mv" | "ad";
export type CellChangeAt = { lane: number; step: number; change: CellChange };
type WhatIfOption = { title: string; gain: string; cost: string; changes: readonly CellChangeAt[] };

const whatIfOptions: readonly WhatIfOption[] = [
  {
    title: "Online booking only",
    gain: "No queue at the desk",
    cost: "Walk-in users lose their path",
    changes: [
      { lane: 0, step: 2, change: "rm" },
      { lane: 1, step: 2, change: "ch" },
      { lane: 1, step: 3, change: "ch" },
      { lane: 2, step: 2, change: "ch" },
      { lane: 2, step: 3, change: "ch" },
      { lane: 2, step: 4, change: "ch" },
      { lane: 3, step: 3, change: "ch" },
    ],
  },
  {
    title: "Online and walk-in",
    gain: "Nobody is turned away",
    cost: "Two paths to keep current",
    changes: [
      { lane: 0, step: 2, change: "mv" },
      { lane: 1, step: 2, change: "ch" },
      { lane: 1, step: 3, change: "ch" },
    ],
  },
  {
    title: "Online for returning users",
    gain: "Smallest change",
    cost: "New users still walk in",
    changes: [
      { lane: 0, step: 2, change: "ad" },
      { lane: 1, step: 2, change: "ch" },
    ],
  },
];

export const whatif = {
  sources: "Your blueprint today",
  result: "Options it explores, none applied",
  suggested: "Suggested",
  /** "Differs in 3 cells", split round the count, which is drawn in bold. */
  differs: (count: number) => ["Differs in ", ` ${count === 1 ? "cell" : "cells"}`] as const,
  /** Read out before what an option gains and what it costs; on screen a sign marks each. */
  gainLabel: "Gains: ",
  costLabel: "Costs: ",
  /** The cell the question is about: today it has a gap. */
  question: { lane: 0, step: 2 },
  options: whatIfOptions,
} as const;

export const harness = {
  headline: "Harness for your agents.",
  subheadline:
    "Four skills your agents run on the blueprint: map it, slice it, audit it, and trace a change before you make it.",
  more: { label: "Read the skills", link: links.github },
  tabsLabel: "The four skills",
  replay: "Play again",
  skills: [
    {
      id: "map",
      label: "Map",
      command: "/ub:map",
      caption:
        "Point it at your docs. It works out the lanes and steps, places what it finds, and holds the draft until you sign off.",
    },
    {
      id: "slice",
      label: "Slice",
      command: "/ub:slice",
      caption:
        "Cut out the part someone needs: a journey to onboard a new hire, a lane to brief a team, a step to fix a moment, a cell to hand off a task, or a custom set to scope a project.",
    },
    {
      id: "audit",
      label: "Audit",
      command: "/ub:audit",
      caption:
        "Check that the blueprint still holds. It finds what is missing, conflicting or unowned, and ranks each finding by impact and effort.",
    },
    {
      id: "whatif",
      label: "What-if",
      command: "/ub:whatif",
      caption:
        "Trace a change before you make it. Each option comes back as its own version of the blueprint, with what differs, what it gains and what it costs. Nothing is applied until you sign off.",
    },
  ],
} as const;

// The ids above are the ones the page knows how to draw.
harness.skills satisfies readonly { id: SkillId }[];

/** One skill's tab, command and caption. */
export const skill = (id: SkillId) => harness.skills.find((s) => s.id === id) ?? harness.skills[0];
