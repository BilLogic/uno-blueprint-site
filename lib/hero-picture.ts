/**
 * The hero picture's model and geometry, apart from the DOM and the clock.
 *
 * Tools send documents through the node into the cells of a blueprint; people
 * and agents (the walkers) stand on filled cells and step to nearby ones; the
 * cell a person stops on is shown in the panel and projected into it. The
 * timeline that drives this lives in hooks/use-hero-picture.ts; everything it
 * decides or draws is computed here, with the randomness passed in.
 */

export const ROWS = 4;
export const COLS = 6;

/** 1 = a cell that gets filled, 0 = a gap the blueprint leaves open. */
const GRID = [
  [1, 1, 0, 1, 1, 1],
  [1, 1, 1, 0, 1, 1],
  [0, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 0, 1],
] as const;

export const cellAt = (row: number, col: number) => row * COLS + col;
export const rowOf = (cell: number) => Math.floor(cell / COLS);
const colOf = (cell: number) => cell % COLS;

/** Every cell that gets filled, row by row. */
export const FILLS: readonly number[] = GRID.flatMap((row, r) =>
  row.flatMap((fill, c) => (fill ? [cellAt(r, c)] : [])),
);

export type Walker = "person" | "agent";
export const WALKERS: readonly Walker[] = ["person", "agent", "person", "agent"];

/** Milliseconds, as the prototype times them. */
export const TIMING = {
  firstTick: 1100,
  tick: 1500,
  tickJitter: 400,
  /** How often a picture that is off screen checks again. */
  idle: 900,
  /** The full board rests this long before it fades and starts over. */
  rest: 4200,
  fade: 520,
  afterReset: 900,
  /** A document travels from a tool to the node, then from the node to the board. */
  feed: 700,
  toBoard: 420,
  /** A walker's step lands this long after it starts. */
  arrive: 650,
  /** The panel blanks, then takes the new cell, then shows it. */
  close: 260,
  reveal: 340,
  relayout: 120,
  hit: 900,
  ping: 700,
} as const;

/** The curve a document follows along a beam. */
export const BEAM_EASING = "cubic-bezier(.45,0,.25,1)";

/** A cell flashes when a document or a walker arrives. */
export const HIT_KEYFRAMES: Keyframe[] = [
  { offset: 0, boxShadow: "0 0 0 0 var(--color-brand)" },
  { offset: 0.3, boxShadow: "0 0 0 2px var(--color-brand), 0 0 20px var(--color-brand-soft)" },
  { offset: 1, boxShadow: "0 0 0 0 transparent" },
];

/** The node rings when a document passes through it. */
export const PING_KEYFRAMES: Keyframe[] = [
  { opacity: 1, boxShadow: "0 0 0 0 var(--color-brand)" },
  { opacity: 0, boxShadow: "0 0 0 12px transparent" },
];

/** A document's run along a beam of `length` whose dash is `dash` long. */
export const runKeyframes = (dash: number, length: number): Keyframe[] => [
  { strokeDashoffset: dash, opacity: 1 },
  { strokeDashoffset: -length, opacity: 1 },
];

/** The dash a document draws on a beam: short, and never longer than most of the beam. */
export function beamDash(length: number) {
  const dash = Math.min(40, length * 0.45);
  return { dash, dashArray: `${dash} ${length + dash + 20}` };
}

export type Board = {
  /** Per cell, the tools whose documents landed there; a cell with any is filled. */
  sources: readonly (readonly number[])[];
  /** Per walker, the cell it stands on. */
  at: readonly (number | null)[];
  /** The cell lit on the board and projected into the panel. */
  focus: number | null;
  /** The cell the panel describes; it outlasts `focus` while the panel blanks. */
  shown: number | null;
  panel: "shown" | "hidden";
  /** The board fades out between rounds. */
  fading: boolean;
  /** Tools sending a document right now. */
  lit: readonly number[];
};

/** The finished picture: every cell filled, the walkers spread out, the first person's cell open. */
export function settledBoard(toolCount: number): Board {
  const sources: number[][] = Array.from({ length: ROWS * COLS }, () => []);
  FILLS.forEach((cell, i) => sources[cell]?.push(i % toolCount));
  const focus = cellAt(0, 1);
  return {
    sources,
    at: [cellAt(0, 1), cellAt(1, 2), cellAt(2, 3), cellAt(3, 0)],
    focus,
    shown: focus,
    panel: "shown",
    fading: false,
    lit: [],
  };
}

export type BoardAction =
  | { type: "reset"; landed: readonly (readonly [cell: number, tool: number])[]; at: readonly number[] }
  | { type: "land"; cell: number; tool: number }
  | { type: "move"; at: readonly (number | null)[] }
  | { type: "close" }
  | { type: "focus"; cell: number }
  | { type: "reveal" }
  | { type: "fade"; on: boolean }
  | { type: "light"; tool: number; on: boolean };

export function boardReducer(board: Board, action: BoardAction): Board {
  switch (action.type) {
    case "reset": {
      const sources: number[][] = board.sources.map(() => []);
      for (const [cell, tool] of action.landed) sources[cell]?.push(tool);
      return { ...board, sources, at: action.at, focus: null };
    }
    case "land":
      return {
        ...board,
        sources: board.sources.map((list, cell) => (cell === action.cell ? [...list, action.tool] : list)),
      };
    case "move":
      return { ...board, at: action.at };
    case "close":
      return { ...board, focus: null, panel: "hidden" };
    case "focus":
      return { ...board, focus: action.cell, shown: action.cell };
    case "reveal":
      return { ...board, panel: "shown" };
    case "fade":
      return { ...board, fading: action.on };
    case "light":
      return {
        ...board,
        lit: action.on ? [...board.lit, action.tool] : board.lit.filter((tool) => tool !== action.tool),
      };
  }
}

export type Random = () => number;

const pick = <T>(list: readonly T[], random: Random): T => list[Math.floor(random() * list.length)]!;

function shuffle<T>(list: readonly T[], random: Random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export const filledCells = (board: Board) =>
  board.sources.flatMap((list, cell) => (list.length ? [cell] : []));

/** A document for an open cell, or "extra": another source for a cell already filled. */
export type FeedEvent = number | "extra";

const START_FILLED = 7;
const EXTRAS = 4;

/**
 * A new round: some cells start filled, the rest arrive in a random order with
 * a few extra sources mixed in, and the walkers start on filled cells.
 */
export function planRound(random: Random, toolCount: number) {
  const order = shuffle(FILLS, random);
  const landed = order
    .slice(0, START_FILLED)
    .map((cell) => [cell, Math.floor(random() * toolCount)] as const);
  const queue: FeedEvent[] = order.slice(START_FILLED);
  for (let i = 0; i < EXTRAS; i++) {
    queue.splice(3 + Math.floor(random() * (queue.length - 2)), 0, "extra");
  }
  const start = shuffle(
    landed.map(([cell]) => cell),
    random,
  );
  return { landed, queue, at: WALKERS.map((_, i) => start[i]!) };
}

/** The filled cells within two steps of `from`, or any other filled cell when none is that close. */
export function nearCells(from: number, pool: readonly number[]) {
  const others = pool.filter((cell) => cell !== from);
  const close = others.filter(
    (cell) => Math.abs(rowOf(cell) - rowOf(from)) + Math.abs(colOf(cell) - colOf(from)) <= 2,
  );
  return close.length ? close : others;
}

/**
 * One walker steps to a nearby filled cell; now and then a person and an agent
 * go together. `person` says whether a person arrives, which opens the cell.
 */
export function planStep(board: Board, random: Random) {
  const pool = filledCells(board);
  if (pool.length < 3) return null;
  const walker = Math.floor(random() * WALKERS.length);
  const from = board.at[walker] ?? pick(pool, random);
  const to = pick(nearCells(from, pool), random);
  const pair =
    random() < 0.3 ? WALKERS.findIndex((kind, j) => j !== walker && kind !== WALKERS[walker]) : -1;
  const at = board.at.map((cell, i) => (i === walker || i === pair ? to : cell));
  const person = WALKERS[walker] === "person" || (pair >= 0 && WALKERS[pair] === "person");
  return { at, to, person };
}

/** Where a document goes and which free tool sends it; null when an extra finds no cell to join. */
export function planFeed(board: Board, event: FeedEvent, freeTools: readonly number[], random: Random) {
  let cell = event;
  if (cell === "extra") {
    const open = board.sources.flatMap((list, i) => (list.length && list.length < 2 ? [i] : []));
    if (!open.length) return null;
    cell = pick(open, random);
  }
  return { cell, tool: pick(freeTools, random) };
}

/** The beam a tool's documents travel: one per row of tools on a wide screen, one per tool on a phone. */
export const beamOf = (tool: number, vertical: boolean) => (vertical ? tool : Math.floor(tool / 2));

/** What the panel shows for a cell: skeleton widths in percent, its status, its lane, its sources. */
export function panelFill(cell: number, sources: readonly number[], statusCount: number) {
  return {
    summary: 62 + ((cell * 7) % 30),
    summaryShort: 34 + ((cell * 11) % 32),
    status: cell % statusCount,
    lane: rowOf(cell),
    evidence: sources.map((tool, j) => ({ tool, width: 58 - j * 14 + (cell % 3) * 6 })),
  };
}

/** A rectangle in the stage's coordinates. */
export type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };

export const relativeTo = (outer: Box, inner: Box): Box => ({
  left: inner.left - outer.left,
  top: inner.top - outer.top,
  right: inner.right - outer.left,
  bottom: inner.bottom - outer.top,
  width: inner.width,
  height: inner.height,
});

/**
 * The beams: from the tools into the node, then from the node to the board.
 * Wide, a curve leaves the right-hand tool of each row; on a phone, a curve
 * drops from every tool in the single row above the node.
 */
export function beamPaths(tools: readonly Box[], node: Box, sheet: Box, vertical: boolean) {
  if (vertical) {
    const nx = node.left + node.width / 2;
    const top = node.top - 5;
    const feeds = tools.map((tool) => {
      const x = tool.left + tool.width / 2;
      const y = tool.bottom + 4;
      const m = top - y;
      return `M${x} ${y}C${x} ${y + m * 0.6} ${nx} ${top - m * 0.6} ${nx} ${top}`;
    });
    return { feeds, toBoard: `M${nx} ${node.bottom + 5}L${nx} ${sheet.top - 5}` };
  }
  const nx = node.left - 6;
  const ny = node.top + node.height / 2;
  const feeds = [0, 1, 2, 3].map((row) => {
    const tool = tools[row * 2 + 1]!;
    const x = tool.right + 6;
    const y = tool.top + tool.height / 2;
    const m = nx - x;
    return `M${x} ${y}C${x + m * 0.55} ${y} ${nx - m * 0.55} ${ny} ${nx} ${ny}`;
  });
  return { feeds, toBoard: `M${node.right + 6} ${ny}L${sheet.left - 5} ${ny}` };
}

/** Each walker's place in the queue on its cell, so walkers sharing a cell stand side by side. */
export const slotsOf = (at: readonly (number | null)[]) =>
  at.map((cell, i) => at.slice(0, i).filter((other) => other === cell).length);

/** Where a walker stands: on the top edge of its cell, in from the right corner by its slot. */
export function walkerSpot(
  cell: { left: number; top: number; width: number },
  slot: number,
  walker: { width: number; height: number },
) {
  return { x: cell.left + cell.width - (slot + 1) * (walker.width - 5) + 4, y: cell.top - walker.height * 0.42 };
}

type Point = readonly [x: number, y: number];

/**
 * The projection from a cell to the panel, in the stage's coordinates: the
 * light (a quad from the cell's far edge to the panel's near edge), its two
 * edges, and the clip that sweeps it from the cell to the panel. Wide, it runs
 * left to right; on a phone, downwards.
 */
export function projection(stage: Box, cell: Box, panel: Box, vertical: boolean) {
  const corners: Point[] = vertical
    ? [
        [cell.left, cell.bottom],
        [cell.right, cell.bottom],
        [panel.right - 16, panel.top],
        [panel.left + 16, panel.top],
      ]
    : [
        [cell.right, cell.top],
        [panel.left, panel.top + 16],
        [panel.left, panel.bottom - 16],
        [cell.right, cell.bottom],
      ];
  const points = corners.map(([x, y]) => [x - stage.left, y - stage.top] as const);
  const [a, b, c, d] = points as [Point, Point, Point, Point];
  const edges = vertical ? [[a, d], [b, c]] : [[a, b], [d, c]];
  return {
    points: points.map((point) => point.join(",")).join(" "),
    edges: edges.map(([from, to]) => ({ x1: from![0], y1: from![1], x2: to![0], y2: to![1] })),
    from: vertical
      ? `inset(0 0 ${stage.bottom - cell.bottom}px 0)`
      : `inset(0 ${stage.right - cell.right}px 0 0)`,
    to: vertical
      ? `inset(0 0 ${stage.bottom - panel.top - 1}px 0)`
      : `inset(0 ${stage.right - panel.left - 1}px 0 0)`,
  };
}
