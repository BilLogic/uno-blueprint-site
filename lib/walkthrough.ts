/**
 * The structure walkthrough's maths: which step a scroll position shows, how
 * each pose is scaled and placed in the frame, and where every sheet, the
 * board and its ghosts sit at a step. Geometry is in the stage's own
 * coordinates, a 1010 by 530 box that is scaled to fit the frame.
 */

export const STAGE_WIDTH = 1010;
export const STAGE_HEIGHT = 530;
const STAGE_CENTRE = STAGE_WIDTH / 2;

/** The steps where the picture changes kind. */
export const STEP = {
  /** One blueprint, flat and facing the reader. */
  blueprint: 4,
  /** The columns are read. */
  steps: 12,
  /** One cell is picked out. */
  cell: 13,
  /** That cell opens in its panel. */
  open: 14,
} as const;

/** Timing for the script-driven motion, in ms. */
export const TIMING = {
  /** The beam waits for the board to shrink before it sweeps to the panel. */
  beamDelay: 520,
  /** How long the projection lines follow the moving sheets after a step changes. */
  follow: 2400,
  /** A resize is acted on once it has paused this long. */
  resizeSettle: 120,
} as const;

/** The fixed nav's height, and the margin kept above and below the pinned frame, in px. */
const NAV_HEIGHT = 64;
const FRAME_MARGIN = 32;
const MIN_STICKY_TOP = 76;

/**
 * The beam's clip, open from the stage's left edge to `to` in stage px. The
 * sweep runs from the picked cell's edge to the panel's, one px short so it
 * meets the panel's rim without crossing it.
 */
export const beamClip = (to: number) => `inset(-60px ${STAGE_WIDTH - to}px -60px 0)`;

/** The stack of sheets, the flat blueprint, and the blueprint with its panel. */
export type Pose = 0 | 1 | 2;

export const poseOf = (step: number): Pose => (step >= STEP.open ? 2 : step >= STEP.blueprint ? 1 : 0);

/** Each step's end, as a fraction of the whole scroll, from the scroll length each step gets. */
export function stepEdges(lengths: readonly number[]): number[] {
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let reached = 0;
  return lengths.map((length) => (reached += length) / total);
}

/** The step showing at `progress` (0 at the start of the section's scroll, 1 at its end). */
export function stepAt(progress: number, edges: readonly number[]): number {
  // Just short of 1, so the last step holds to the very end.
  const t = Math.min(0.9999, Math.max(0, progress));
  const step = edges.findIndex((edge) => t < edge);
  return step === -1 ? edges.length - 1 : step;
}

type ScrollGeometry = {
  /** Where the pinned frame sticks, from the top of the viewport. */
  stickyTop: number;
  /** The scrolling section's top, from the top of the viewport. */
  sectionTop: number;
  sectionHeight: number;
  stickyHeight: number;
};

/** How far through its scroll the pinned section is, 0 to 1. */
export function scrollProgress({ stickyTop, sectionTop, sectionHeight, stickyHeight }: ScrollGeometry): number {
  const travel = sectionHeight - stickyHeight;
  if (travel <= 0) return 0;
  return Math.min(1, Math.max(0, (stickyTop - sectionTop) / travel));
}

/** Where the frame sticks: in the middle of the screen under the nav, never above 76 px. */
export const stickyTopFor = (viewportHeight: number, stickyHeight: number) =>
  Math.max(MIN_STICKY_TOP, NAV_HEIGHT + (viewportHeight - NAV_HEIGHT - stickyHeight) / 2);

/** The viewport height the stage may use once the nav, its margins, the headline and the caption are placed. */
export const availableStageHeight = (viewportHeight: number, headHeight: number, captionHeight: number) =>
  viewportHeight - NAV_HEIGHT - FRAME_MARGIN - headHeight - captionHeight;

export type StageFit = {
  /** A phone-width frame: each pose gets its own scale and is centred on what it shows. */
  narrow: boolean;
  /** The frame's height in px. */
  height: number;
  /** The scale of each pose. */
  scales: readonly [number, number, number];
};

/**
 * Scales the stage to the frame. On a wide frame the three poses share one
 * scale; on a phone each gets the scale that fills the frame.
 */
export function fitStage(frameWidth: number, availableHeight: number): StageFit {
  const width = frameWidth || STAGE_WIDTH;
  if (width < 700) {
    const height = Math.max(220, Math.min(availableHeight, width * 0.95));
    return {
      narrow: true,
      height,
      scales: [
        Math.min(width / 372, height / 580),
        Math.min(width / 700, height / 440),
        Math.min(width / 800, height / 500),
      ],
    };
  }
  const k = Math.max(0.25, Math.min(1, width / STAGE_WIDTH, availableHeight / STAGE_HEIGHT));
  return { narrow: false, height: STAGE_HEIGHT * k, scales: [k, k, k] };
}

/** The vertical middle and horizontal centre of what each pose shows, in stage px. */
const POSE_MIDDLE = [292, 319, 258] as const;
const POSE_CENTRE = [505, 516, 494] as const;

/**
 * The stage's transform for a pose. On a phone the pose is centred in `room`:
 * the height between the frame's top and the caption's first line.
 */
export function poseTransform(fit: StageFit, pose: Pose, room: number): string {
  const k = fit.scales[pose];
  if (!fit.narrow) return `scale(${k})`;
  const x = ((STAGE_CENTRE - POSE_CENTRE[pose]) * k).toFixed(1);
  const y = (room / 2 - POSE_MIDDLE[pose] * k).toFixed(1);
  return `translate(${x}px,${y}px) scale(${k})`;
}

const ISO = "rotateX(58deg) rotateZ(-45deg)";
const FLAT = "rotateX(0deg) rotateZ(0deg)";
const SHEET_GAP = 100;
const STACK_CENTRE = 255;

export type SheetState = { transform: string; gone: boolean; out: boolean; delay: number };
export type RowState = { current: boolean; dim: boolean; named: boolean };
export type LineState = { on: boolean; current: boolean };
export type TagState = { top: number; in: boolean; current: boolean };

export type Scene = {
  pose: Pose;
  flat: boolean;
  open: boolean;
  /** The board's header words show (flat, before the panel opens). */
  named: boolean;
  steps: boolean;
  cell: boolean;
  sheets: SheetState[];
  board: { transform: string; delay: number };
  ghosts: string[];
  rows: RowState[];
  lines: LineState[];
  /** The projection lines from each sheet to the one below. */
  links: boolean[];
  tags: TagState[];
};

const SHEETS = 3;
const GHOSTS = 2;
const LANES = 4;
const LINES = 3;

/**
 * Everything the stage shows at `step`, having come from `previous` (-1 on
 * first paint). The sheets leave first and the board follows; coming back,
 * the board tips away first and the sheets return after it.
 */
export function sceneAt(step: number, previous: number): Scene {
  const e = Math.min(step, 3);
  const flat = step >= STEP.blueprint;
  const open = step >= STEP.open;
  const wasFlat = previous >= STEP.blueprint;
  const goFlat = flat && !wasFlat;
  const goIso = !flat && wasFlat;

  // The stack stays centred on the stage as it grows.
  const ty = (i: number) => STACK_CENTRE - 95 - (e * SHEET_GAP) / 2 + (i <= e ? i * SHEET_GAP : e * SHEET_GAP + (i - e) * 8);
  const boardY = ty(3) + 95 - STACK_CENTRE;
  const boardX = open ? -215 : 0;
  const boardScale = open ? 0.62 : 1.1;
  // The followed tiles stay lit while the sheets fly off, as they were on the last stacked step.
  const lit = flat ? (wasFlat ? 3 : Math.min(Math.max(previous, 0), 3)) : e;

  const sheets = Array.from({ length: SHEETS }, (_, i): SheetState => ({
    transform: flat
      ? `translate(${560 - i * 30}px,${-430 + i * 26}px) ${ISO} scale(.82)`
      : `translate(0px,${ty(i)}px) ${ISO}`,
    gone: flat,
    out: i < lit,
    delay: goFlat ? i * 70 : goIso ? 420 + (2 - i) * 70 : 0,
  }));

  // Lane r is read at step 5 + 2r, the line under it at 6 + 2r.
  const reading = step > STEP.blueprint && step < STEP.steps;
  const rows = Array.from({ length: LANES }, (_, i): RowState => {
    const at = STEP.blueprint + 1 + 2 * i;
    return { current: at === step, dim: reading && at > step, named: step >= at && !open };
  });
  const lines = Array.from({ length: LINES }, (_, a): LineState => {
    const at = STEP.blueprint + 2 + 2 * a;
    return { on: step === STEP.blueprint || step >= STEP.steps || (reading && at <= step), current: at === step };
  });

  return {
    pose: poseOf(step),
    flat,
    open,
    named: flat && !open,
    steps: step === STEP.steps,
    cell: step >= STEP.cell,
    sheets,
    board: {
      transform: flat
        ? `translate(${boardX}px,0px) ${FLAT} scale(${boardScale})`
        : `translate(0px,${boardY}px) ${ISO} scale(.5)`,
      delay: goFlat ? 460 : 0,
    },
    // Nearest the board first.
    ghosts: Array.from({ length: GHOSTS }, (_, j) => {
      const n = j + 1;
      return flat
        ? `translate(${boardX + n * 13}px,${-n * 11}px) ${FLAT} scale(${boardScale})`
        : `translate(0px,${boardY + n * 10}px) ${ISO} scale(.5)`;
    }),
    rows,
    lines,
    links: Array.from({ length: SHEETS }, (_, i) => !flat && i < e),
    tags: Array.from({ length: 4 }, (_, i): TagState => ({ top: ty(i) + 95, in: !flat && i <= e, current: i === e })),
  };
}
