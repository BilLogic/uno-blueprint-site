/**
 * The map picture as a timeline. Each phrase is read, then its lane and step
 * open on the board, then it lands in its cell. It ends on the finished board,
 * with the last cell's mark cleared.
 */

/** The gap between one phrase and the next, and when the first is read (ms). */
export const MAP_PHRASE_GAP = 1150;
const FIRST_READ = 500;
const OPEN_AFTER = 460;
const PLACE_AFTER = 960;
const END_AFTER = 600;

export type MapStep =
  | { at: number; kind: "read" | "open" | "place"; phrase: number }
  | { at: number; kind: "end" };

/** Every step of the picture, in time order, for phrases read in `readOrder`. */
export function mapSteps(readOrder: readonly number[]): MapStep[] {
  const steps: MapStep[] = [];
  readOrder.forEach((phrase, n) => {
    const at = FIRST_READ + n * MAP_PHRASE_GAP;
    steps.push({ at, kind: "read", phrase });
    steps.push({ at: at + OPEN_AFTER, kind: "open", phrase });
    steps.push({ at: at + PLACE_AFTER, kind: "place", phrase });
  });
  steps.push({ at: FIRST_READ + readOrder.length * MAP_PHRASE_GAP + END_AFTER, kind: "end" });
  return steps;
}

type Placement = { lane: number; step: number };

export type MapFrame = {
  /** Phrases picked out of their documents. */
  read: ReadonlySet<number>;
  /** Lanes that exist on the board, and steps that have opened. */
  lanes: readonly boolean[];
  steps: readonly boolean[];
  /** Phrases placed in their cells; `latest` is the one just placed, while it is marked. */
  placed: ReadonlySet<number>;
  latest: number | null;
  /** How many times the skill has pinged, so each read can replay the ping. */
  pings: number;
};

/**
 * The picture after the first `count` steps. Stacked on a narrow screen, every
 * lane and step is open from the start so the board keeps its height, and the
 * skill pings as each phrase passes through it instead.
 */
export function mapFrame(
  steps: readonly MapStep[],
  count: number,
  placements: readonly Placement[],
  stacked: boolean,
  laneCount: number,
  stepCount: number,
): MapFrame {
  const read = new Set<number>();
  const placed = new Set<number>();
  const lanes = Array.from({ length: laneCount }, () => stacked);
  const cols = Array.from({ length: stepCount }, () => stacked);
  let latest: number | null = null;
  let pings = 0;
  for (const step of steps.slice(0, count)) {
    if (step.kind === "end") {
      latest = null;
      continue;
    }
    const placement = placements[step.phrase];
    if (!placement) continue;
    const { lane, step: col } = placement;
    if (step.kind === "read") {
      read.add(step.phrase);
      if (stacked) pings += 1;
    } else if (step.kind === "open") {
      lanes[lane] = true;
      cols[col] = true;
    } else {
      placed.add(step.phrase);
      latest = step.phrase;
    }
  }
  return { read, lanes, steps: cols, placed, latest, pings };
}

/** The board's step columns: an open step takes its share, a closed one none, so a new one widens from nothing. */
export const mapColumns = (open: readonly boolean[]) => open.map((o) => (o ? "1fr" : "0fr")).join(" ");

export type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };

/**
 * The two curves for one phrase: from the right edge of its document, at the
 * phrase's height, into the skill; and out of the skill to the lane it lands
 * in. Boxes are page rectangles; the paths are in the picture's own space.
 */
export function mapLinks({
  frame,
  skill,
  phrase,
  doc,
  lane,
}: Record<"frame" | "skill" | "phrase" | "doc" | "lane", Box>): [string, string] {
  const inX = skill.left - frame.left - 6;
  const outX = skill.right - frame.left + 6;
  const y = skill.top - frame.top + skill.height / 2;
  const x0 = doc.right - frame.left + 2;
  const y0 = phrase.top - frame.top + phrase.height / 2;
  const x1 = lane.left - frame.left - 4;
  const y1 = lane.top - frame.top + lane.height / 2;
  const d1 = inX - x0;
  const d2 = x1 - outX;
  return [
    `M${x0} ${y0}C${x0 + d1 * 0.6} ${y0} ${inX - d1 * 0.5} ${y} ${inX} ${y}`,
    `M${outX} ${y}C${outX + d2 * 0.5} ${y} ${x1 - d2 * 0.6} ${y1} ${x1} ${y1}`,
  ];
}
