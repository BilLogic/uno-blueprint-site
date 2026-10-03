/** The example service the product mocks show: a repair shop's walk-in intake. */

export type LaneKey = "user" | "front" | "back" | "support";

export type Lane = { key: LaneKey; name: string; steps: readonly string[] };

export const repairBoard = {
  title: "Repair intake, walk-in path",
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
} as const satisfies { title: string; gapLabel: string; detail: object; lanes: readonly Lane[] };
