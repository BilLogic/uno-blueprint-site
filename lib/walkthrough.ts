/**
 * The structure walkthrough's maths: which step a scroll position asks for,
 * how the walkthrough steps toward it one step at a time, how each pose is
 * scaled and placed in the frame, and where every sheet, the board and its
 * ghosts sit at a step. Geometry is in the stage's own coordinates, a 1010 by
 * 530 box that is scaled to fit the frame. The opening cards' morph into the
 * stack is in `walkthrough-morph.ts`.
 */

export const STAGE_WIDTH = 1010;
export const STAGE_HEIGHT = 530;
const STAGE_CENTRE = STAGE_WIDTH / 2;

/** The steps where the picture changes kind. */
export const STEP = {
  /** The cards of a team's context, before they become the stack. */
  context: 0,
  /** One blueprint, flat and facing the reader. */
  blueprint: 5,
  /** The columns are read. */
  steps: 13,
  /** One cell is picked out. */
  cell: 14,
  /** That cell opens in its panel. */
  open: 15,
} as const;

/** Timing for the script-driven motion, in ms. */
export const TIMING = {
  /** The beam waits for the board to shrink before it sweeps to the panel. */
  beamDelay: 520,
  /** How long the projection lines follow the moving sheets after a step changes. */
  follow: 2400,
  /** A resize is acted on once it has paused this long. */
  resizeSettle: 120,
  /** The opening cards becoming the stack: timed, not scrubbed by the scroll. */
  morph: 1700,
  /** The longest frame the morph advances by, so a stalled tab does not jump it to the end. */
  morphFrameCap: 64,
  /** The hold on a step before the walkthrough moves on toward the scroll. */
  step: 560,
  /** The hold after the stack folds flat, or stands back up: its choreography is longer. */
  flatten: 1250,
  /** The hold after the cell opens in its panel, or closes. */
  openCell: 950,
} as const;

/** How far into the opening step's scroll, as a fraction of it, the morph plays. */
const INTRO_TRIGGER = 0.42;
/** The widest viewport that scrolls like a phone, in px. */
const PHONE_MAX_WIDTH = 760;
/** A desktop gets this share of each step's scroll; a phone gets all of it. */
const DESKTOP_SCROLL_SHARE = 0.9;

/** The fixed nav's height, and the margin kept above and below the pinned frame, in px. */
const NAV_HEIGHT = 64;
const FRAME_MARGIN = 32;
const MIN_STICKY_TOP = 76;
/** A frame taller than the screen less this is pinned higher, with its foot this far above the bottom. */
const TALL_FRAME_SLACK = 72;
const TALL_FRAME_FOOT = 12;
/** On a wide frame the stage never scales below this share of what its width allows. */
const MIN_WIDE_SHARE = 0.85;
/** A phone frame is this share of its width tall, and never less than this share of that. */
const NARROW_HEIGHT = 0.95;
const MIN_NARROW_SHARE = 0.85;
const MIN_NARROW_HEIGHT = 220;
/** On a phone the pose is centred this far above the caption's first line, in px. */
export const CAPTION_GAP = 12;

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

// Just short of 1, so the last step holds to the very end.
const clampProgress = (progress: number) => Math.min(0.9999, Math.max(0, progress));

/** The step under `progress` (0 at the start of the section's scroll, 1 at its end). */
export function stepAt(progress: number, edges: readonly number[]): number {
  const t = clampProgress(progress);
  const step = edges.findIndex((edge) => t < edge);
  return step === -1 ? edges.length - 1 : step;
}

/**
 * Whether the reader is far enough into the opening step for its cards to
 * become the stack: a buffer into the step, not on arrival.
 */
export function introTriggered(progress: number, edges: readonly number[]): boolean {
  const t = clampProgress(progress);
  const first = edges[0] ?? 1;
  return t >= first || t / first > INTRO_TRIGGER;
}

/**
 * The step the scroll asks for. Past the trigger, the opening step hands on to
 * the next one as soon as `stackFormed`, so the reader need not scroll its
 * whole length.
 */
export function goalStep(progress: number, edges: readonly number[], stackFormed: boolean): number {
  const step = stepAt(progress, edges);
  return step === STEP.context && stackFormed && introTriggered(progress, edges) ? STEP.context + 1 : step;
}

/**
 * The next step on the way from `current` to `goal`: one at a time, however
 * fast the page scrolls, so no step is skipped. The opening step is left only
 * once its cards have become the stack.
 */
export function nextStep(current: number, goal: number, stackFormed: boolean): number {
  if (current === goal) return current;
  if (current === STEP.context && goal > current && !stackFormed) return current;
  return current + (goal > current ? 1 : -1);
}

/** How long a step is held, after moving `from` one step `to` another, before the next move. */
export function stepHold(from: number, to: number): number {
  const flat = (step: number) => step >= STEP.blueprint;
  const open = (step: number) => step >= STEP.open;
  if (flat(from) !== flat(to)) return TIMING.flatten;
  if (open(from) !== open(to)) return TIMING.openCell;
  return TIMING.step;
}

/** The section's scroll length in viewport heights, from its steps' total. */
export const scrollLength = (totalVh: number, viewportWidth: number) =>
  Number((totalVh * (viewportWidth <= PHONE_MAX_WIDTH ? 1 : DESKTOP_SCROLL_SHARE)).toFixed(1));

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

/**
 * Where the frame sticks: in the middle of the screen under the nav, never
 * above 76 px. A frame too tall for that sits higher, its foot just above the
 * bottom of the screen.
 */
export function stickyTopFor(viewportHeight: number, stickyHeight: number): number {
  if (stickyHeight > viewportHeight - TALL_FRAME_SLACK) {
    return Math.min(MIN_STICKY_TOP, viewportHeight - stickyHeight - TALL_FRAME_FOOT);
  }
  return Math.max(MIN_STICKY_TOP, NAV_HEIGHT + (viewportHeight - NAV_HEIGHT - stickyHeight) / 2);
}

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
 * scale, which may use the headline's height too (`headHeight`), so a short
 * screen does not shrink the picture below 85% of what the width allows; on a
 * phone each pose gets the scale that fills the frame.
 */
export function fitStage(frameWidth: number, availableHeight: number, headHeight: number): StageFit {
  const width = frameWidth || STAGE_WIDTH;
  if (width < 700) {
    const full = width * NARROW_HEIGHT;
    const height = Math.max(MIN_NARROW_HEIGHT, Math.min(full, Math.max(availableHeight, full * MIN_NARROW_SHARE)));
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
  const byWidth = Math.min(1, width / STAGE_WIDTH);
  const byHeight = (availableHeight + headHeight) / STAGE_HEIGHT;
  const k = Math.max(0.25, byWidth * MIN_WIDE_SHARE, Math.min(byWidth, byHeight));
  return { narrow: false, height: STAGE_HEIGHT * k, scales: [k, k, k] };
}

/**
 * The vertical middle and horizontal centre of what each pose shows, in stage px.
 * The middles are measured from the drawn board, not the prototype's figures,
 * which left the flat board 35 px high in its frame on a phone.
 */
const POSE_MIDDLE = [260, 250, 229] as const;
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

const SHEETS = 3;
const GHOSTS = 2;
/** On the flat board, each path behind it sits this much higher and further right, in stage px. */
const FLAT_GHOST_RISE = 11;
const FLAT_GHOST_SHIFT = 13;

/**
 * The flat board and the two paths peeking out above it, as one picture: its
 * middle in stage px, before any lift. The board is 372 px tall from 69 px
 * down, scaled about its own middle; each path behind it is 11 px higher.
 */
const FLAT_BOARD_MIDDLE = 69 + 372 / 2 - (GHOSTS * FLAT_GHOST_RISE) / 2;

/**
 * How far to move the flat board down, in stage px, so the space above it
 * (with the paths behind it) equals the space between it and the caption.
 * `captionLine` is the caption's first line, in px below the frame's top. On
 * a phone the pose is already centred above that line (see `poseTransform`),
 * short of it by `CAPTION_GAP`, which is made up here.
 */
export function flatLift(fit: StageFit, captionLine: number): number {
  const k = fit.scales[1] || 1;
  const middle = fit.narrow ? POSE_MIDDLE[1] + CAPTION_GAP / (2 * k) : captionLine / (2 * k);
  return middle - FLAT_BOARD_MIDDLE;
}

const ISO = "rotateX(58deg) rotateZ(-45deg)";
const FLAT = "rotateX(0deg) rotateZ(0deg)";
const SHEET_GAP = 100;
/** Once the paths join the stack, its sheets close up to this gap. */
const FULL_STACK_GAP = 86;
/** How far the stack is lowered at each depth, so it reads centred as it grows. */
const STACK_DROP = [0, 0, 8, 22] as const;
const STACK_CENTRE = 255;
const BOARD_STACK_SCALE = 0.5;
/** The paths behind the board, each this much further down the stack. */
const GHOST_STEP = 10;

/** The deepest the stack goes: services, phases, scenarios, then paths. */
const MAX_DEPTH = 3;

/** How many sheets are stacked at `step`, less one: services is 0, paths is 3. */
const depthAt = (step: number) => Math.min(Math.max(step - STEP.context - 1, 0), MAX_DEPTH);

/** The stage px from the stage's top to sheet `i`, with the stack `depth` deep. */
function sheetY(depth: number, i: number): number {
  const gap = depth === 3 ? FULL_STACK_GAP : SHEET_GAP;
  const below = i <= depth ? i * gap : depth * gap + (i - depth) * 8;
  return STACK_CENTRE - 95 - (depth * gap) / 2 + STACK_DROP[depth as 0 | 1 | 2 | 3] + below;
}

/** A layer of the stack: where it is moved to and how it is scaled, in stage px. */
export type LayerPlace = { tx: number; ty: number; scale: number };

/**
 * The six layers of the stack at `step` (before it folds flat): the three
 * sheets, the board, and the two paths behind it, nearest first.
 */
export function stackLayers(step: number): LayerPlace[] {
  const depth = depthAt(step);
  const boardY = sheetY(depth, 3) + 95 - STACK_CENTRE;
  return [
    ...Array.from({ length: SHEETS }, (_, i) => ({ tx: 0, ty: sheetY(depth, i), scale: 1 })),
    ...Array.from({ length: GHOSTS + 1 }, (_, n) => ({ tx: 0, ty: boardY + n * GHOST_STEP, scale: BOARD_STACK_SCALE })),
  ];
}

export type SheetState = { transform: string; gone: boolean; out: boolean; delay: number };
export type RowState = { current: boolean; dim: boolean; named: boolean };
export type LineState = { on: boolean; current: boolean };
export type TagState = { top: number; in: boolean; current: boolean };

export type Scene = {
  /** The opening cards show and the stack is hidden. */
  intro: boolean;
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

const LANES = 4;
const LINES = 3;

/**
 * Everything the stage shows at `step`, having come from `previous` (-1 on
 * first paint). The sheets leave first and the board follows; coming back,
 * the board tips away first and the sheets return after it. The flat board is
 * moved down by `lift` stage px (see `flatLift`) while the panel is closed.
 */
export function sceneAt(step: number, previous: number, lift = 0): Scene {
  const e = depthAt(step);
  const intro = step === STEP.context;
  const flat = step >= STEP.blueprint;
  const open = step >= STEP.open;
  const wasFlat = previous >= STEP.blueprint;
  const goFlat = flat && !wasFlat;
  const goIso = !flat && wasFlat;

  // The stack stays centred on the stage as it grows.
  const ty = (i: number) => sheetY(e, i);
  const boardY = ty(3) + 95 - STACK_CENTRE;
  const boardX = open ? -215 : 0;
  const boardLift = open ? 0 : lift;
  const boardScale = open ? 0.62 : 1.1;
  // The followed tiles stay lit while the sheets fly off, as they were on the last stacked step.
  const lit = flat ? (wasFlat ? 3 : depthAt(previous)) : e;

  const sheets = Array.from({ length: SHEETS }, (_, i): SheetState => ({
    transform: flat
      ? `translate(${560 - i * 30}px,${-430 + i * 26}px) ${ISO} scale(.82)`
      : `translate(0px,${ty(i)}px) ${ISO}`,
    gone: flat,
    out: i < lit,
    delay: goFlat ? i * 70 : goIso ? 420 + (2 - i) * 70 : 0,
  }));

  // Lane r is read at step 6 + 2r, the line under it at 7 + 2r.
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
    intro,
    pose: poseOf(step),
    flat,
    open,
    named: flat && !open,
    steps: step === STEP.steps,
    cell: step >= STEP.cell,
    sheets,
    board: {
      transform: flat
        ? `translate(${boardX}px,${boardLift}px) ${FLAT} scale(${boardScale})`
        : `translate(0px,${boardY}px) ${ISO} scale(.5)`,
      delay: goFlat ? 460 : 0,
    },
    // Nearest the board first.
    ghosts: Array.from({ length: GHOSTS }, (_, j) => {
      const n = j + 1;
      return flat
        ? `translate(${boardX + n * FLAT_GHOST_SHIFT}px,${-n * FLAT_GHOST_RISE + boardLift}px) ${FLAT} scale(${boardScale})`
        : `translate(0px,${boardY + n * GHOST_STEP}px) ${ISO} scale(.5)`;
    }),
    rows,
    lines,
    links: Array.from({ length: SHEETS }, (_, i) => !flat && i < e),
    tags: Array.from({ length: 4 }, (_, i): TagState => ({ top: ty(i) + 95, in: !flat && !intro && i <= e, current: i === e })),
  };
}
