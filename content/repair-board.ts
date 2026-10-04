/** The example service the product mocks show: a repair shop's walk-in intake. */

export type LaneKey = "user" | "front" | "back" | "support";

/** How a cell stands out: lit by an answer, changed by a what-if, or missing its owner. */
export type CellMark = "hi" | "warn" | "gap";

/** Marked cells, by step name; every step on the board has a distinct name. */
export type Marks = Readonly<Partial<Record<string, CellMark>>>;

/** A lane's steps: six on the full board, four on a view cut down for one audience. */
export type Steps = readonly [string, string, string, string] | readonly [string, string, string, string, string, string];

export type Lane = { key: LaneKey; name: string; steps: Steps };

/** The journey the board maps, and the path through it. */
const journey = "Repair intake";
const path = "walk-in path";

export const repairBoard = {
  journey,
  path,
  title: `${journey}, ${path}`,
  /** What a step with nobody on it reads instead of its name. */
  gapLabel: "No owner",
  /** A step opened in a side panel: who owns it (nobody yet), its status and its source. */
  detail: {
    owner: "Owner",
    missing: "Missing",
    status: "Status · Live",
    sourcesTitle: "Sources",
    source: "Intake SOP · Notion",
  },
  lanes: [
    {
      key: "user",
      name: "User",
      steps: [
        "Books a slot",
        "Drops off the device",
        "Technician diagnoses",
        "Quote approved",
        "Repair done",
        "Picks up",
      ],
    },
    {
      key: "front",
      name: "Frontstage",
      steps: [
        "Front desk logs it",
        "Tags the device",
        "Bench test",
        "Calls with quote",
        "Signs off",
        "Hands over",
      ],
    },
    {
      key: "back",
      name: "Backstage",
      steps: [
        "Confirms the slot",
        "Opens a ticket",
        "Checks parts",
        "Prices the repair",
        "Updates the status",
        "Sets a locker code",
      ],
    },
    {
      key: "support",
      name: "Support",
      steps: [
        "Booking system",
        "Ticket system",
        "Parts inventory",
        "Quote record",
        "Email service",
        "Locker system",
      ],
    },
  ],
} as const satisfies {
  journey: string;
  path: string;
  title: string;
  gapLabel: string;
  detail: { owner: string; missing: string; status: string; sourcesTitle: string; source: string };
  lanes: readonly Lane[];
};

/** The names of one lane's steps, so content naming a step fails the typecheck when it is renamed. */
export type StepName<K extends LaneKey> = Extract<(typeof repairBoard.lanes)[number], { key: K }>["steps"][number];
