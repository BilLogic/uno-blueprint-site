/**
 * The hero picture's model and geometry, apart from the DOM and the clock.
 *
 * Tools send documents through the node into the cells of a blueprint; people
 * and agents (the walkers) stand on filled cells and step to nearby ones. Now
 * and then an agent walks to a tool and carries a source back into a cell, and
 * a person walks into the panel and stops on a field. The cell a person stops
 * on is shown in the panel and projected into it. Each round opens on the
 * board alone (solo), larger, with no panel; the panel slides in the first
 * time a person opens a cell, and closes again a while later. The timeline
 * that drives this lives in hooks/use-hero-picture.ts; everything it decides
 * or draws is computed here, with the randomness and the clock passed in.
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

/** The panel's fields a person stops on: never a tab label, where they would cover the word. */
export type Field = "status" | "owner";
export const FIELDS: readonly Field[] = ["status", "owner"];

/** Where a walker stands: on a cell, on a tool, or on one of the panel's fields. */
export type Place = { kind: "cell"; cell: number } | { kind: "tool"; tool: number } | { kind: "field"; field: Field };

export const onCell = (cell: number): Place => ({ kind: "cell", cell });
export const cellOf = (place: Place | null | undefined) => (place?.kind === "cell" ? place.cell : null);
const placeKey = (place: Place | null) =>
  place === null ? null : place.kind === "cell" ? `c${place.cell}` : place.kind === "tool" ? `t${place.tool}` : `f${place.field}`;

/** Milliseconds, as the prototype times them. */
export const TIMING = {
  /** The finished board shows this long before the first round starts. */
  firstRound: 1100,
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
  /** The picture measures itself this long after the page loads, at the next idle moment (or `startBy` later at most). */
  afterLoad: 1000,
  startBy: 1000,
  hit: 900,
  ping: 700,
  /** A tool an agent reaches lights this long. */
  toolLit: 700,
  /** While the board grows or shrinks, the walkers and the beam ride along with it this long, and nobody sets off. */
  ride: 720,
  /** Leaving solo, the board gives its room back for this long before the cell opens. */
  unsolo: 760,
  /** A new cell opens at most this often, so the last one has time to be read. */
  cooldown: 2600,
  /** A round's board stands alone at least this long before a person opens the panel. */
  soloGrace: 5000,
  /** The panel closes again once it has been open this long. */
  panelLife: 11000,
} as const;

/** The curve a document follows along a beam. */
export const BEAM_EASING = "cubic-bezier(.45,0,.25,1)";

/** A cell flashes when a document or a walker arrives. */
export const HIT_KEYFRAMES: Keyframe[] = [
  { offset: 0, boxShadow: "0 0 0 0 var(--color-brand)" },
  { offset: 0.3, boxShadow: "0 0 0 2px var(--color-brand), 0 0 20px var(--color-brand-soft)" },
  { offset: 1, boxShadow: "0 0 0 0 transparent" },
];

/** A panel field pings when a person stops on it (the prototype's cp-hit, eased out). */
export const FIELD_PING_KEYFRAMES: Keyframe[] = [
  { boxShadow: "0 0 0 0 color-mix(in oklab, var(--color-brand) 55%, transparent)" },
  { boxShadow: "0 0 0 7px transparent" },
];
export const FIELD_PING_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

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
  /** Per walker, where it stands. */
  at: readonly (Place | null)[];
  /** Per walker, the tool whose source it is carrying to a cell. */
  carry: readonly (number | null)[];
  /** The board stands alone, larger, and the panel is away. */
  solo: boolean;
  /** The status a person set on the open cell, in place of its own. */
  status: number | null;
  /** The cell a person last opened; it stays while the panel blanks for the next one. */
  focus: number | null;
  /** The focus is lit on the board and projected into the panel. */
  projecting: boolean;
  /** The cell the panel describes. */
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
    at: [cellAt(0, 1), cellAt(1, 2), cellAt(2, 3), cellAt(3, 0)].map(onCell),
    carry: WALKERS.map(() => null),
    solo: false,
    status: null,
    focus,
    projecting: true,
    shown: focus,
    panel: "shown",
    fading: false,
    lit: [],
  };
}

export type BoardAction =
  | { type: "reset"; landed: readonly (readonly [cell: number, tool: number])[]; at: readonly number[] }
  | { type: "land"; cell: number; tool: number }
  | { type: "move"; at: readonly (Place | null)[]; carry?: readonly (number | null)[] }
  | { type: "drop"; walker: number; cell: number }
  | { type: "solo"; on: boolean }
  | { type: "restatus"; status: number }
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
      return {
        ...board,
        sources,
        at: action.at.map(onCell),
        carry: board.carry.map(() => null),
        focus: null,
        projecting: false,
      };
    }
    case "land":
      return {
        ...board,
        sources: board.sources.map((list, cell) => (cell === action.cell ? [...list, action.tool] : list)),
      };
    case "move":
      return { ...board, at: action.at, carry: action.carry ?? board.carry };
    case "drop": {
      const tool = board.carry[action.walker];
      const carry = board.carry.map((held, i) => (i === action.walker ? null : held));
      if (tool == null) return board;
      if ((board.sources[action.cell]?.length ?? 2) >= 2) return { ...board, carry };
      return {
        ...board,
        carry,
        sources: board.sources.map((list, cell) => (cell === action.cell ? [...list, tool] : list)),
      };
    }
    case "solo": {
      if (!action.on) return { ...board, solo: false };
      // Anyone in the panel walks back to the cell they were editing.
      const home = board.focus ?? filledCells(board)[0];
      const at = board.at.map((place) => (place?.kind === "field" && home !== undefined ? onCell(home) : place));
      return { ...board, at, solo: true, focus: null, projecting: false, panel: "hidden" };
    }
    case "restatus":
      return { ...board, status: action.status };
    case "close":
      return { ...board, projecting: false, panel: "hidden" };
    case "focus":
      return { ...board, focus: action.cell, projecting: true, shown: action.cell, status: null };
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

/** What the walkers can reach right now: the tools, and the panel's fields while the panel is shown. */
export type Reach = { tools: readonly number[]; fields: readonly Field[] };

/**
 * One walker's next walk, as the prototype plans it. From a cell, an agent now
 * and then goes to a tool to pick up a source, and a person to a field of the
 * open panel; otherwise the walker steps to a nearby filled cell, now and then
 * with a walker of the other kind. From a tool, an agent carries its source to
 * a cell with room for it; from the panel, a person goes back near the open
 * cell. `person` says whether a person arrives on a cell, which opens it.
 */
export function planStep(board: Board, random: Random, reach: Reach) {
  const pool = filledCells(board);
  if (pool.length < 3) return null;
  const walker = Math.floor(random() * WALKERS.length);
  const agent = WALKERS[walker] === "agent";
  const from = board.at[walker] ?? onCell(pick(pool, random));
  const onMap = from.kind === "cell";
  const errand = random();
  const carry = [...board.carry];
  const at = [...board.at];
  const go = (to: Place) => {
    at[walker] = to;
    return { walker, at, carry, to, person: false };
  };
  if (onMap && agent && errand < 0.3 && reach.tools.length) {
    const tool = pick(reach.tools, random);
    carry[walker] = tool;
    return go({ kind: "tool", tool });
  }
  if (onMap && !agent && board.focus !== null && errand < 0.3 && reach.fields.length) {
    return go({ kind: "field", field: pick(reach.fields, random) });
  }
  const roomy = pool.filter((cell) => (board.sources[cell]?.length ?? 0) < 2);
  const cell = onMap
    ? pick(nearCells(from.cell, pool), random)
    : board.carry[walker] != null && roomy.length
      ? pick(roomy, random)
      : pick(board.focus !== null ? nearCells(board.focus, pool) : pool, random);
  const to = onCell(cell);
  const pair =
    onMap && random() < 0.3
      ? WALKERS.findIndex((kind, j) => j !== walker && kind !== WALKERS[walker] && board.at[j]?.kind === "cell")
      : -1;
  if (pair >= 0) at[pair] = to;
  const plan = go(to);
  return { ...plan, person: !agent || (pair >= 0 && WALKERS[pair] === "person") };
}

/** The walkers standing on a panel that is not shown, sent back to filled cells; null when none is. */
export function rehome(board: Board, random: Random, fieldsShown: boolean) {
  if (fieldsShown || !board.at.some((place) => place?.kind === "field")) return null;
  const pool = filledCells(board);
  if (!pool.length) return null;
  return board.at.map((place) => (place?.kind === "field" ? onCell(pick(pool, random)) : place));
}

/** The status a person sets: any that reads differently from the one shown. */
export function nextStatus(current: number, statuses: readonly string[], random: Random) {
  const others = statuses.flatMap((label, i) => (label === statuses[current] ? [] : [i]));
  return pick(others, random);
}

/** When the loop last went solo, opened the panel, and opened a cell (performance.now() milliseconds). */
export type Clock = { soloAt: number; openSince: number; lastOpen: number };

/** A new cell opens only once the last has had time to be read. */
export const mayOpen = (clock: Clock, now: number) => now - clock.lastOpen >= TIMING.cooldown;

/** A person arriving on a cell opens it, unless the board has only just gone solo. */
export const personOpens = (solo: boolean, clock: Clock, now: number) => !(solo && now - clock.soloAt < TIMING.soloGrace);

/** The panel has been open long enough, and the board goes solo again. */
export const panelExpired = (solo: boolean, clock: Clock, now: number) => !solo && now - clock.openSince > TIMING.panelLife;

/**
 * How much the board grows when it stands alone: from its left edge into the
 * panel's room (its gap and its width), as far as the frame's height allows,
 * and never smaller than it is.
 */
export function soloScale(size: { board: number; gap: number; panel: number; stageHeight: number; sheetHeight: number }) {
  const room = (size.board + size.gap + size.panel) / size.board;
  const tall = (size.stageHeight - 56) / (size.sheetHeight + 18);
  return Math.max(1, Math.min(room, tall));
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

/** Each walker's place in the queue on its spot, so walkers sharing one stand side by side. */
export const slotsOf = (at: readonly (Place | null)[]) => {
  const keys = at.map(placeKey);
  return keys.map((key, i) => keys.slice(0, i).filter((other) => other === key).length);
};

/**
 * Where a walker stands, in the stage's coordinates: on the top edge of its
 * target, in from the right corner by its slot. It never leaves the frame, and
 * on a panel field (`panelRight` given) never leaves the panel.
 */
export function walkerSpot(
  target: Box,
  slot: number,
  walker: { width: number; height: number },
  frame: { width: number; height: number },
  panelRight: number | null,
) {
  const right = panelRight === null ? frame.width - walker.width - 4 : panelRight - walker.width - 10;
  const x = target.right - (slot + 1) * (walker.width - 5) + 4;
  const y = target.top - walker.height * 0.42;
  return {
    x: Math.max(4, Math.min(right, x)),
    y: Math.max(4, Math.min(frame.height - walker.height - 4, y)),
  };
}

type Point = readonly [x: number, y: number];

/**
 * The projection from a cell to the panel, in the stage's coordinates: the
 * light (a quad from the cell's far edge to the panel's near edge), its two
 * edges, and the clip that sweeps it from the cell to the panel, left to
 * right. A phone shows no panel, so it never projects.
 */
export function projection(stage: Box, cell: Box, panel: Box) {
  const corners: Point[] = [
    [cell.right, cell.top],
    [panel.left, panel.top + 16],
    [panel.left, panel.bottom - 16],
    [cell.right, cell.bottom],
  ];
  const points = corners.map(([x, y]) => [x - stage.left, y - stage.top] as const);
  const [a, b, c, d] = points as [Point, Point, Point, Point];
  return {
    points: points.map((point) => point.join(",")).join(" "),
    edges: [
      { x1: a[0], y1: a[1], x2: b[0], y2: b[1] },
      { x1: d[0], y1: d[1], x2: c[0], y2: c[1] },
    ],
    from: `inset(0 ${stage.right - cell.right}px 0 0)`,
    to: `inset(0 ${stage.right - panel.left - 1}px 0 0)`,
  };
}
