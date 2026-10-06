import { map } from "@/content/harness";
import { mapSteps } from "@/lib/harness-map";

/** The harness map picture's first placed phrase: when it lands after the picture starts, in ms, and its text. */
const step = mapSteps(map.readOrder).find((candidate) => candidate.kind === "place")!;
export const firstPlace = { at: step.at, text: map.placements[step.kind === "end" ? 0 : step.phrase]!.text };
