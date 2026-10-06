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

/** The step where one cell is picked out and then opens in its panel. */
const CELL_STEP = 14;

/** The steps where the picture changes kind. */
export const STEP = {
  /** The cards of a team's context, before they become the stack. */
  context: 0,
  /** One blueprint, flat and facing the reader. */
  blueprint: 5,
  /** The columns are read. */
  steps: 13,
  /** One cell is picked out, and opens in its panel a beat later (see `cellOpensLate`). */
  cell: CELL_STEP,
  /** The cell's panel is open: the same step, once its beat has passed. */
  open: CELL_STEP,
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
  /**
   * The hold after the stack folds flat, or stands back up. It covers the CSS
   * choreography (the sheets' stagger, the board's delay and its turn, in
   * `Walkthrough.module.css` and `sceneAt`), so change them together.
   */
  flatten: 1250,
  /** The hold after the cell opens in its panel, or closes: the beam's delay and sweep, then the panel opening. */
  openCell: 950,
  /** How long the picked cell shows lit on the flat board before it opens, arriving from above. */
  cellBeat: 700,
} as const;

/** How far into the opening step's scroll, as a fraction of it, the morph plays. */
const INTRO_TRIGGER = 0.42;
/** The widest viewport that scrolls like a phone, in px. */
const PHONE_MAX_WIDTH = 760;
/** A phone gets this multiple of each step's scroll; a desktop gets the steps' own. */
const PHONE_SCROLL_STRETCH = 1.1;

/** The fixed nav's height, and the margin kept above and below the pinned frame, in px. */
export const NAV_HEIGHT = 64;
const FRAME_MARGIN = 32;
const MIN_STICKY_TOP = 76;
/** A frame too tall to stick at 76 px is pinned higher, with its foot this far above the bottom. */
const TALL_FRAME_FOOT = 12;
/** The least a wide stage is scaled to, however short the screen. */
const MIN_WIDE_SCALE = 0.25;
/** A phone frame is this share of its width tall, and never less than this many px. */
const NARROW_HEIGHT = 0.95;
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

/** Whether the panel is open at `step`, given whether the cell's beat has passed (see `cellOpensLate`). */
const panelOpen = (step: number, opened: boolean) => step >= STEP.open && opened;

/** The pose at `step`; `opened` says whether the cell has opened, which waits for its beat. */
export const poseOf = (step: number, opened = true): Pose =>
  panelOpen(step, opened) ? 2 : step >= STEP.blueprint ? 1 : 0;

/**
 * Whether arriving at `step` from `previous` (-1 on first paint) lights the
 * cell first and opens it `TIMING.cellBeat` later: only when the cell step is
 * reached from above. Leaving it, it closes at once.
 */
export const cellOpensLate = (step: number, previous: number) => step >= STEP.open && previous < STEP.open;

/**
 * How long the cell takes to arrive from above, in ms: lit for `cellBeat`,
 * then its panel waits `panelDelay` for the beam and opens over `panelOpen`.
 * The panel's two times are CSS tokens (`--duration-panel-delay` and
 * `--duration-leave` in styles/tokens.css), read at runtime.
 */
export const cellArrival = ({ cellBeat, panelDelay, panelOpen }: { cellBeat: number; panelDelay: number; panelOpen: number }) =>
  cellBeat + panelDelay + panelOpen;

/** Room past the cell's arrival before the hold at the end lets go anyway, in ms, should its panel never report it has opened. */
const HOLD_SLACK = 500;

/**
 * The longest the hold at the end lasts, in ms: the cell's arrival (see
 * `cellArrival`) and a little room, counted from the first move the hold
 * stops (see `holdsExit` and `shouldLock`), not from when the last step shows.
 */
export const holdCap = (arrival: number) => arrival + HOLD_SLACK;

/** Short of where the walkthrough lets go, or past it by less than this, in px, is there: scroll positions come in fractions. */
const EXIT_SLACK = 1;

/**
 * The scroll position where the walkthrough lets go of its frame, from the
 * section's geometry on screen and the page's scroll `y`; `null` when the
 * section is no taller than its frame, so nothing is pinned.
 */
export function exitScroll({ stickyTop, sectionTop, sectionHeight, stickyHeight }: ScrollGeometry, y: number): number | null {
  const travel = sectionHeight - stickyHeight;
  if (travel <= 0) return null;
  return y + sectionTop - stickyTop + travel;
}

/** A scroll the reader asks for at the walkthrough's end. */
export type ExitMove = {
  /** The step on show. */
  step: number;
  /** On the last step: whether its cell is still lighting and opening (it was reached from above, and its panel is not yet open). */
  opening: boolean;
  /** How long ago this hold first stopped a move, in ms; `null` while it has stopped none. */
  sinceHeld: number | null;
  /** The longest a hold lasts from the first move it stops, in ms (see `cellArrival`). */
  cap: number;
  /** How far the move would scroll the page, in px: positive going down. */
  delta: number;
  /** The page's scroll position, and the one where the walkthrough lets go of its frame, in px. */
  y: number;
  exit: number;
};

/**
 * Whether a move is held: stopped before the page moves, so a scroll does not
 * carry the reader out of the walkthrough before its last step has shown and
 * its cell has opened. Only a move down that would cross where the
 * walkthrough lets go is held, while the walkthrough is still on its way to
 * the last step or that step's cell is still opening, and never for longer
 * than `cap` from the first move held. A page already past the exit, or any
 * move up, is never held.
 */
export function holdsExit({ step, opening, sinceHeld, cap, delta, y, exit }: ExitMove): boolean {
  if (delta <= 0 || y > exit + EXIT_SLACK || y + delta <= exit) return false;
  if (sinceHeld !== null && sinceHeld >= cap) return false;
  return step < STEP.cell || opening;
}

/** How far ahead a scroll is looked at, at its last pace, for whether it is about to cross the exit, in ms: three frames or so. */
const LOOK_AHEAD = 50;
/**
 * A scroll whose last event came within this long of the one before, in ms, is
 * under way: its frames come a few to a busy frame apart, each moving it about
 * as far as the last. A late frame makes its pace look low, so it is also
 * looked at this many of its last moves ahead.
 */
const UNDER_WAY = 100;
const MOVES_AHEAD = 2;
/** A page that moved further than this between two scroll events, in px, jumped there (a link, a script, the page coming back to where it was). */
const JUMP = 500;

/** The page's scroll at the walkthrough's end, as it moves. */
export type ExitScroll = {
  /** The page's scroll position, and the one where the walkthrough lets go of its frame, in px. */
  y: number;
  exit: number;
  /** How far the page moved since the last scroll event, in px (positive going down), and how long ago that came, in ms. */
  lastDelta: number;
  lastGap: number;
  /** Whether a hold is still to come: the walkthrough has not reached its last step, or that step's cell is still opening. */
  pending: boolean;
  /** How long ago this hold first stopped the page, in ms; `null` while it has not. */
  sinceHeld: number | null;
  /** The longest a hold lasts from when it first stops the page, in ms (see `cellArrival`). */
  cap: number;
};

/**
 * Whether the page's scroll is locked at the exit as it moves: whatever the
 * input, a trackpad's momentum and a wheel the browser will not let be
 * stopped among them. A page going down that has reached the exit, or would
 * cross it within `LOOK_AHEAD` at its last pace or within `MOVES_AHEAD` moves
 * the size of its last while under way, is locked there (and brought
 * to the exit when short of it), while a hold is still to come and for no
 * longer than `cap` from when the hold first stopped the page. A page already
 * past the exit is left where it is, and a page going up is never locked. A
 * page that jumped (a link, a script) is not a scroll under way, so it is not
 * locked; a short jump after a pause has no pace to speak of, so it is locked
 * only once it is at the exit.
 */
export function shouldLock({ y, exit, lastDelta, lastGap, pending, sinceHeld, cap }: ExitScroll): boolean {
  if (!pending || lastDelta <= 0 || lastDelta > JUMP || y > exit + EXIT_SLACK) return false;
  if (sinceHeld !== null && sinceHeld >= cap) return false;
  const pace = lastDelta / Math.max(lastGap, 1);
  const ahead = Math.max(pace * LOOK_AHEAD, lastGap <= UNDER_WAY ? lastDelta * MOVES_AHEAD : 0);
  return y + ahead >= exit - EXIT_SLACK;
}

/** How far a wheel reported in lines scrolls, per line, in px. */
const WHEEL_LINE = 40;

/**
 * A wheel's `delta` in px, from its `mode` (`WheelEvent.deltaMode`: 0 pixels,
 * 1 lines, 2 pages) and the page's height, as some browsers report a mouse
 * wheel in lines.
 */
export function wheelPixels(delta: number, mode: number, pageHeight: number): number {
  if (mode === 1) return delta * WHEEL_LINE;
  if (mode === 2) return delta * pageHeight;
  return delta;
}

/** How far an arrow key scrolls, in px: a little more than browsers do, so a press that would cross the exit is caught. */
const KEY_LINE = 60;

/**
 * How far a key (a `KeyboardEvent.key`) scrolls the page down, in px, at
 * most: negative going up, 0 for a key that does not scroll a page
 * `pageHeight` tall.
 */
export function keyScroll(key: string, shift: boolean, pageHeight: number): number {
  if (key === " ") return shift ? -pageHeight : pageHeight;
  if (key === "PageDown") return pageHeight;
  if (key === "ArrowDown") return KEY_LINE;
  if (key === "PageUp" || key === "Home") return -pageHeight;
  if (key === "ArrowUp") return -KEY_LINE;
  return 0;
}

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
 * Which way the opening morph should play, given whether the scroll is past
 * its trigger and the step on show. It plays back only once the walkthrough
 * has walked back to the opening step, so a fast scroll up never starts it
 * while the stack it would unmake is still on screen.
 */
export function morphHeading(triggered: boolean, step: number): "forward" | "back" | "hold" {
  if (triggered) return "forward";
  return step === STEP.context ? "back" : "hold";
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

/** How many steps the walkthrough may fall behind the scroll and still walk to it; further behind, it jumps. */
export const CATCH_UP = 2;

/**
 * The next step on the way from `current` to `goal`. At a reading pace the
 * walkthrough walks, one step at a time; scrolled further ahead (or back) than
 * `CATCH_UP` steps, it jumps straight to the goal, skipping the steps between.
 * The opening step is left only once its cards have become the stack.
 */
export function nextStep(current: number, goal: number, stackFormed: boolean): number {
  if (current === goal) return current;
  if (current === STEP.context && goal > current && !stackFormed) return current;
  if (Math.abs(goal - current) > CATCH_UP) return goal;
  return current + (goal > current ? 1 : -1);
}

/**
 * How long a step is held, after moving `from` one step `to` another, before
 * the next move. On the way down the cell's beat comes first, so the cell
 * lights, opens, and is then held as long as any opening.
 */
export function stepHold(from: number, to: number): number {
  const flat = (step: number) => step >= STEP.blueprint;
  const open = (step: number) => step >= STEP.open;
  if (flat(from) !== flat(to)) return TIMING.flatten;
  if (open(from) !== open(to)) return TIMING.openCell + (cellOpensLate(to, from) ? TIMING.cellBeat : 0);
  return TIMING.step;
}

/** The section's scroll length in viewport heights, from its steps' total. */
export const scrollLength = (totalVh: number, viewportWidth: number) =>
  Number((totalVh * (viewportWidth <= PHONE_MAX_WIDTH ? PHONE_SCROLL_STRETCH : 1)).toFixed(1));

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
 * above 76 px. A frame too tall for that sits higher, its foot 12 px above
 * the bottom of the screen, but never above the nav's bottom edge: the nav is
 * see-through, and the headline would read through it. `fitStage` scales the
 * stage so the frame fits; only one already at its smallest runs off the foot.
 */
export function stickyTopFor(viewportHeight: number, stickyHeight: number): number {
  if (MIN_STICKY_TOP + stickyHeight + TALL_FRAME_FOOT > viewportHeight) {
    return Math.max(NAV_HEIGHT, viewportHeight - stickyHeight - TALL_FRAME_FOOT);
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
 * Scales the stage to the frame, so the headline, the stage and the caption
 * fit between the nav and the foot of the screen (`availableHeight`, see
 * `availableStageHeight`). On a wide frame the three poses share one scale,
 * as large as both the width and that height allow; on a phone each pose gets
 * the scale that fills the frame.
 */
export function fitStage(frameWidth: number, availableHeight: number): StageFit {
  const width = frameWidth || STAGE_WIDTH;
  if (width < 700) {
    const height = Math.max(MIN_NARROW_HEIGHT, Math.min(width * NARROW_HEIGHT, availableHeight));
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
  const byHeight = availableHeight / STAGE_HEIGHT;
  const k = Math.max(MIN_WIDE_SCALE, Math.min(byWidth, byHeight));
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

/** The stack's angle: tilted back and turned, in degrees. The opening cards land at it too. */
export const STACK_ANGLE = { tilt: 58, turn: -45 } as const;
const ISO = `rotateX(${STACK_ANGLE.tilt}deg) rotateZ(${STACK_ANGLE.turn}deg)`;
const FLAT = "rotateX(0deg) rotateZ(0deg)";
const SHEET_GAP = 100;
/** A sheet's middle, this far below its top: a sheet is 190 px tall. Labels and the board line up on it. */
const SHEET_MIDDLE = 95;
/** Below the deepest stacked sheet, each sheet still to come is tucked this close under the last. */
const TUCKED_GAP = 8;
/** Once the paths join the stack, its sheets close up to this gap. */
const FULL_STACK_GAP = 86;
/** How far the stack is lowered at each depth, so it reads centred as it grows. */
const STACK_DROP: Readonly<Record<StackDepth, number>> = { 0: 0, 1: 0, 2: 8, 3: 22 };
const STACK_CENTRE = 255;
const BOARD_STACK_SCALE = 0.5;
/** The paths behind the board, each this much further down the stack. */
const GHOST_STEP = 10;

/** The deepest the stack goes: services, phases, scenarios, then paths. */
const MAX_DEPTH = 3;
/** How deep the stack is: services 0, phases 1, scenarios 2, paths 3. */
type StackDepth = 0 | 1 | 2 | 3;
const DEPTHS: readonly StackDepth[] = [0, 1, 2, 3];

/** How many sheets are stacked at `step`, less one: services is 0, paths is 3. */
const depthAt = (step: number): StackDepth => DEPTHS[Math.min(Math.max(step - STEP.context - 1, 0), MAX_DEPTH)]!;

/** The stage px from the stage's top to sheet `i`, with the stack `depth` deep. */
function sheetY(depth: StackDepth, i: number): number {
  const gap = depth === MAX_DEPTH ? FULL_STACK_GAP : SHEET_GAP;
  const below = i <= depth ? i * gap : depth * gap + (i - depth) * TUCKED_GAP;
  return STACK_CENTRE - SHEET_MIDDLE - (depth * gap) / 2 + STACK_DROP[depth] + below;
}

/** Where the board sits in the stack, `depth` deep: in the place of a fourth sheet, centred on the stage. */
const boardYAt = (depth: StackDepth) => sheetY(depth, SHEETS) + SHEET_MIDDLE - STACK_CENTRE;

/** A layer of the stack: where it is moved to and how it is scaled, in stage px. */
export type LayerPlace = { tx: number; ty: number; scale: number };

/**
 * The six layers of the stack at `step` (before it folds flat): the three
 * sheets, the board, and the two paths behind it, nearest first.
 */
export function stackLayers(step: number): LayerPlace[] {
  const depth = depthAt(step);
  const boardY = boardYAt(depth);
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
 * On the cell step the panel opens only once `opened`: the cell lights on the
 * flat board first (see `cellOpensLate`).
 */
export function sceneAt(step: number, previous: number, lift = 0, opened = true): Scene {
  const e = depthAt(step);
  const intro = step === STEP.context;
  const flat = step >= STEP.blueprint;
  const open = panelOpen(step, opened);
  const wasFlat = previous >= STEP.blueprint;
  const goFlat = flat && !wasFlat;
  const goIso = !flat && wasFlat;

  // The stack stays centred on the stage as it grows.
  const ty = (i: number) => sheetY(e, i);
  const boardY = boardYAt(e);
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
    pose: poseOf(step, opened),
    flat,
    open,
    named: flat && !open,
    steps: step === STEP.steps,
    cell: step >= STEP.cell,
    sheets,
    board: {
      transform: flat
        ? `translate(${boardX}px,${boardLift}px) ${FLAT} scale(${boardScale})`
        : `translate(0px,${boardY}px) ${ISO} scale(${BOARD_STACK_SCALE})`,
      delay: goFlat ? 460 : 0,
    },
    // Nearest the board first.
    ghosts: Array.from({ length: GHOSTS }, (_, j) => {
      const n = j + 1;
      return flat
        ? `translate(${boardX + n * FLAT_GHOST_SHIFT}px,${-n * FLAT_GHOST_RISE + boardLift}px) ${FLAT} scale(${boardScale})`
        : `translate(0px,${boardY + n * GHOST_STEP}px) ${ISO} scale(${BOARD_STACK_SCALE})`;
    }),
    rows,
    lines,
    links: Array.from({ length: SHEETS }, (_, i) => !flat && i < e),
    tags: Array.from({ length: 4 }, (_, i): TagState => ({ top: ty(i) + SHEET_MIDDLE, in: !flat && !intro && i <= e, current: i === e })),
  };
}
