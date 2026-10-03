import { describe, expect, it } from "vitest";
import {
  FILLS,
  WALKERS,
  beamDash,
  beamOf,
  beamPaths,
  boardReducer,
  cellAt,
  filledCells,
  nearCells,
  panelFill,
  planFeed,
  planRound,
  planStep,
  projection,
  settledBoard,
  slotsOf,
  walkerSpot,
  type Board,
  type Box,
} from "./hero-picture";

const TOOLS = 8;

/** A fixed sequence standing in for Math.random, repeating once used up. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

const rect = (left: number, top: number, width: number, height: number): Box => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

describe("settledBoard", () => {
  it("fills every cell the blueprint fills, and leaves its gaps open", () => {
    const board = settledBoard(TOOLS);
    expect(filledCells(board)).toEqual(FILLS);
    expect(FILLS).toHaveLength(19);
    expect(board.sources[cellAt(0, 2)]).toEqual([]);
  });

  it("opens the first person's cell in the panel", () => {
    const board = settledBoard(TOOLS);
    expect(board.at[0]).toBe(cellAt(0, 1));
    expect(board.focus).toBe(cellAt(0, 1));
    expect(board.shown).toBe(cellAt(0, 1));
    expect(board.panel).toBe("shown");
  });
});

describe("boardReducer", () => {
  const board = settledBoard(TOOLS);

  it("starts a round from the cells it lands, with nothing in focus", () => {
    const next = boardReducer(board, { type: "reset", landed: [[cellAt(1, 1), 3]], at: [7, 7, 7, 7] });
    expect(filledCells(next)).toEqual([cellAt(1, 1)]);
    expect(next.sources[cellAt(1, 1)]).toEqual([3]);
    expect(next).toMatchObject({ focus: null, projecting: false });
    expect(next.shown).toBe(board.shown);
  });

  it("adds a source to a cell", () => {
    const next = boardReducer(board, { type: "land", cell: cellAt(0, 0), tool: 5 });
    expect(next.sources[cellAt(0, 0)]).toEqual([0, 5]);
  });

  it("blanks the panel and puts out the light, then takes the new cell, then shows it", () => {
    const closed = boardReducer(board, { type: "close" });
    expect(closed).toMatchObject({ focus: board.focus, projecting: false, shown: board.shown, panel: "hidden" });
    const focused = boardReducer(closed, { type: "focus", cell: 9 });
    expect(focused).toMatchObject({ focus: 9, projecting: true, shown: 9, panel: "hidden" });
    expect(boardReducer(focused, { type: "reveal" }).panel).toBe("shown");
  });

  it("lights a tool while it sends, and only that tool", () => {
    const lit = boardReducer(board, { type: "light", tool: 2, on: true });
    expect(lit.lit).toEqual([2]);
    expect(boardReducer(lit, { type: "light", tool: 2, on: false }).lit).toEqual([]);
  });
});

describe("planRound", () => {
  it("starts with seven cells filled and queues the rest with four extra sources", () => {
    const round = planRound(Math.random, TOOLS);
    expect(round.landed).toHaveLength(7);
    const queuedCells = round.queue.filter((event) => event !== "extra");
    expect(queuedCells).toHaveLength(FILLS.length - 7);
    expect(round.queue.filter((event) => event === "extra")).toHaveLength(4);
    expect(new Set([...round.landed.map(([cell]) => cell), ...queuedCells])).toEqual(new Set(FILLS));
  });

  it("never queues an extra before the third document", () => {
    for (let i = 0; i < 50; i++) {
      expect(planRound(Math.random, TOOLS).queue.slice(0, 3)).not.toContain("extra");
    }
  });

  it("starts every walker on a filled cell", () => {
    const round = planRound(Math.random, TOOLS);
    const landed = round.landed.map(([cell]) => cell);
    expect(round.at).toHaveLength(WALKERS.length);
    for (const cell of round.at) expect(landed).toContain(cell);
  });
});

describe("nearCells", () => {
  it("keeps the filled cells within two steps", () => {
    const from = cellAt(1, 1);
    const pool = [from, cellAt(1, 3), cellAt(0, 0), cellAt(3, 5)];
    expect(nearCells(from, pool)).toEqual([cellAt(1, 3), cellAt(0, 0)]);
  });

  it("falls back to any other filled cell when none is close", () => {
    expect(nearCells(cellAt(0, 0), [cellAt(0, 0), cellAt(3, 5)])).toEqual([cellAt(3, 5)]);
  });
});

describe("planStep", () => {
  it("waits until three cells are filled", () => {
    const board: Board = { ...settledBoard(TOOLS), sources: settledBoard(TOOLS).sources.map((_, i) => (i < 2 ? [0] : [])) };
    expect(planStep(board, Math.random)).toBeNull();
  });

  it("moves one walker to a nearby filled cell", () => {
    const board = settledBoard(TOOLS);
    // Walker 1 (an agent), the first nearby cell, no pair.
    const plan = planStep(board, sequence(0.3, 0, 0.9))!;
    expect(plan.at[1]).toBe(plan.to);
    expect(plan.at.filter((cell, i) => cell !== board.at[i])).toHaveLength(1);
    expect(plan.person).toBe(false);
  });

  it("sends a person and an agent together now and then, and a person opens the cell", () => {
    const board = settledBoard(TOOLS);
    const plan = planStep(board, sequence(0.3, 0, 0.1))!;
    expect(plan.at[1]).toBe(plan.to);
    expect(plan.at[0]).toBe(plan.to);
    expect(plan.person).toBe(true);
  });
});

describe("planFeed", () => {
  const board = settledBoard(TOOLS);

  it("sends a document for an open cell from a free tool", () => {
    expect(planFeed(board, 4, [2, 6], sequence(0.9))).toEqual({ cell: 4, tool: 6 });
  });

  it("adds an extra source only to a cell with one", () => {
    const plan = planFeed(board, "extra", [0], sequence(0))!;
    expect(board.sources[plan.cell]).toHaveLength(1);
  });

  it("drops an extra when every filled cell has two sources", () => {
    const full: Board = { ...board, sources: board.sources.map((list) => (list.length ? [0, 1] : [])) };
    expect(planFeed(full, "extra", [0], Math.random)).toBeNull();
  });
});

describe("beamOf", () => {
  it("shares a beam between the two tools of a row on a wide screen", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((tool) => beamOf(tool, false))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it("gives every tool its own beam on a phone", () => {
    expect(beamOf(5, true)).toBe(5);
  });
});

describe("beamPaths", () => {
  const tools = Array.from({ length: 8 }, (_, i) => rect((i % 2) * 54, Math.floor(i / 2) * 54, 42, 42));
  const node = rect(200, 80, 44, 44);
  const sheet = rect(300, 0, 500, 300);

  it("curves from the right-hand tool of each row into the node, then runs straight to the sheet", () => {
    const { feeds, toBoard } = beamPaths(tools, node, sheet, false);
    expect(feeds).toHaveLength(4);
    expect(feeds[0]).toBe("M102 21C152.6 21 143.4 102 194 102");
    expect(toBoard).toBe("M250 102L295 102");
  });

  it("drops from every tool into the node, then down to the sheet, on a phone", () => {
    const { feeds, toBoard } = beamPaths(tools, rect(100, 300, 36, 36), rect(0, 400, 300, 200), true);
    expect(feeds).toHaveLength(8);
    expect(feeds[0]).toBe("M21 46C21 195.4 118 145.6 118 295");
    expect(toBoard).toBe("M118 341L118 395");
  });
});

describe("beamDash", () => {
  it("draws a dash of at most 40 px, shorter on a short beam", () => {
    expect(beamDash(200)).toEqual({ dash: 40, dashArray: "40 260" });
    expect(beamDash(20)).toEqual({ dash: 9, dashArray: "9 49" });
  });
});

describe("walkers on a cell", () => {
  it("stand side by side when they share a cell", () => {
    expect(slotsOf([3, 3, 5, 3])).toEqual([0, 1, 0, 2]);
  });

  it("stand on the top edge, in from the right corner", () => {
    const cell = { left: 100, top: 40, width: 70 };
    const spot = walkerSpot(cell, 0, { width: 22, height: 22 });
    expect(spot.x).toBe(157);
    expect(spot.y).toBeCloseTo(30.76);
    expect(walkerSpot(cell, 1, { width: 22, height: 22 }).x).toBe(140);
  });
});

describe("projection", () => {
  const stage = rect(10, 20, 1000, 600);
  const cell = rect(300, 200, 70, 52);
  const panel = rect(700, 100, 250, 450);

  it("runs from the cell's right edge to the panel's left edge on a wide screen", () => {
    const light = projection(stage, cell, panel, false);
    expect(light.points).toBe("360,180 690,96 690,514 360,232");
    expect(light.edges).toEqual([
      { x1: 360, y1: 180, x2: 690, y2: 96 },
      { x1: 360, y1: 232, x2: 690, y2: 514 },
    ]);
    expect(light.from).toBe("inset(0 640px 0 0)");
    expect(light.to).toBe("inset(0 309px 0 0)");
  });

  it("runs from the cell's bottom edge down to the panel's top on a phone", () => {
    const light = projection(stage, cell, rect(30, 400, 300, 180), true);
    expect(light.points).toBe("290,232 360,232 304,380 36,380");
    expect(light.from).toBe("inset(0 0 368px 0)");
    expect(light.to).toBe("inset(0 0 219px 0)");
  });
});

describe("panelFill", () => {
  it("sketches the panel from the cell's position, and lists its sources", () => {
    expect(panelFill(cellAt(0, 1), [4, 2], 6)).toEqual({
      summary: 69,
      summaryShort: 45,
      status: 1,
      lane: 0,
      evidence: [
        { tool: 4, width: 64 },
        { tool: 2, width: 50 },
      ],
    });
  });

  it("picks the lane from the cell's row", () => {
    expect(panelFill(cellAt(3, 2), [], 6)).toMatchObject({ lane: 3, evidence: [] });
  });
});
