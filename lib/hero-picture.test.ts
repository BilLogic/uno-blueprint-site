import { describe, expect, it } from "vitest";
import {
  FILLS,
  TIMING,
  WALKERS,
  cellOf,
  mayOpen,
  nextStatus,
  onCell,
  panelExpired,
  personOpens,
  rehome,
  soloScale,
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

  it("opens the first person's cell in the panel, with the board beside it", () => {
    const board = settledBoard(TOOLS);
    expect(board.at[0]).toEqual(onCell(cellAt(0, 1)));
    expect(board.solo).toBe(false);
    expect(board.focus).toBe(cellAt(0, 1));
    expect(board.shown).toBe(cellAt(0, 1));
    expect(board.panel).toBe("shown");
  });
});

describe("boardReducer", () => {
  const board = settledBoard(TOOLS);

  it("starts a round from the cells it lands, with nothing in focus and nobody carrying", () => {
    const carrying: Board = { ...board, carry: [null, 4, null, null] };
    const next = boardReducer(carrying, { type: "reset", landed: [[cellAt(1, 1), 3]], at: [7, 7, 7, 7] });
    expect(filledCells(next)).toEqual([cellAt(1, 1)]);
    expect(next.sources[cellAt(1, 1)]).toEqual([3]);
    expect(next).toMatchObject({ focus: null, projecting: false });
    expect(next.at).toEqual([onCell(7), onCell(7), onCell(7), onCell(7)]);
    expect(next.carry).toEqual([null, null, null, null]);
    expect(next.shown).toBe(board.shown);
  });

  it("goes solo: the board alone, the panel blank and its light out", () => {
    const solo = boardReducer(board, { type: "solo", on: true });
    expect(solo).toMatchObject({ solo: true, focus: null, projecting: false, panel: "hidden" });
    // The panel comes back blank; the next cell fills it.
    expect(boardReducer(solo, { type: "solo", on: false })).toMatchObject({ solo: false, panel: "hidden", focus: null });
  });

  it("going solo, walks anyone in the panel back to the cell they were editing", () => {
    const editing: Board = { ...board, at: [{ kind: "field", field: "status" }, ...board.at.slice(1)] };
    const solo = boardReducer(editing, { type: "solo", on: true });
    expect(solo.at[0]).toEqual(onCell(board.focus!));
    expect(solo.at.slice(1)).toEqual(board.at.slice(1));
  });

  it("drops a carried source into a cell with room, and nothing into a full one", () => {
    const carrying: Board = { ...board, carry: [null, 5, null, null] };
    const dropped = boardReducer(carrying, { type: "drop", walker: 1, cell: cellAt(0, 0) });
    expect(dropped.sources[cellAt(0, 0)]).toEqual([0, 5]);
    expect(dropped.carry[1]).toBeNull();
    const full = boardReducer(dropped, { type: "drop", walker: 1, cell: cellAt(0, 0) });
    expect(full.sources[cellAt(0, 0)]).toEqual([0, 5]);
    const again = boardReducer({ ...dropped, carry: [null, 6, null, null] }, { type: "drop", walker: 1, cell: cellAt(0, 0) });
    expect(again.sources[cellAt(0, 0)]).toEqual([0, 5]);
    expect(again.carry[1]).toBeNull();
  });

  it("lets a person change the open cell's status, until another cell opens", () => {
    const changed = boardReducer(board, { type: "restatus", status: 4 });
    expect(changed.status).toBe(4);
    expect(boardReducer(changed, { type: "focus", cell: 9 }).status).toBeNull();
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
  const view = { tools: [0, 1, 2, 3, 4, 5, 6, 7], fields: ["status", "owner"] as const };

  it("waits until three cells are filled", () => {
    const board: Board = { ...settledBoard(TOOLS), sources: settledBoard(TOOLS).sources.map((_, i) => (i < 2 ? [0] : [])) };
    expect(planStep(board, Math.random, view)).toBeNull();
  });

  it("moves one walker to a nearby filled cell", () => {
    const board = settledBoard(TOOLS);
    // Walker 1 (an agent), no errand, the first nearby cell, no pair.
    const plan = planStep(board, sequence(0.3, 0.9, 0, 0.9), view)!;
    expect(plan.walker).toBe(1);
    expect(plan.to.kind).toBe("cell");
    expect(plan.at[1]).toEqual(plan.to);
    expect(plan.at.filter((place, i) => place !== board.at[i])).toHaveLength(1);
    expect(plan.person).toBe(false);
  });

  it("sends a person and an agent together now and then, and a person opens the cell", () => {
    const board = settledBoard(TOOLS);
    const plan = planStep(board, sequence(0.3, 0.9, 0, 0.1), view)!;
    expect(plan.at[1]).toEqual(plan.to);
    expect(plan.at[0]).toEqual(plan.to);
    expect(plan.person).toBe(true);
  });

  it("sends an agent to a tool now and then to pick up a source", () => {
    const board = settledBoard(TOOLS);
    const plan = planStep(board, sequence(0.3, 0.1, 0.5), view)!;
    expect(plan.to).toEqual({ kind: "tool", tool: 4 });
    expect(plan.carry[1]).toBe(4);
    expect(plan.person).toBe(false);
  });

  it("carries the source back into a cell with room for it", () => {
    const board: Board = { ...settledBoard(TOOLS), at: [onCell(1), { kind: "tool", tool: 4 }, onCell(8), onCell(18)], carry: [null, 4, null, null] };
    const full = board.sources.map((list, cell) => (cell === cellAt(2, 4) ? list : list.length ? [0, 1] : []));
    const plan = planStep({ ...board, sources: full }, sequence(0.3, 0.9, 0), view)!;
    expect(plan.to).toEqual(onCell(cellAt(2, 4)));
    expect(plan.carry[1]).toBe(4);
  });

  it("sends a person into the open panel to stop on Status or Owner, never a tab", () => {
    const board = settledBoard(TOOLS);
    const plan = planStep(board, sequence(0, 0.1, 0.6), view)!;
    expect(plan.to).toEqual({ kind: "field", field: "owner" });
    expect(plan.person).toBe(false);
  });

  it("keeps people on the board while no cell is open, or the panel is not shown", () => {
    const closed: Board = { ...settledBoard(TOOLS), focus: null };
    expect(planStep(closed, sequence(0, 0.1, 0.6, 0.9), view)!.to.kind).toBe("cell");
    expect(planStep(settledBoard(TOOLS), sequence(0, 0.1, 0.6, 0.9), { ...view, fields: [] })!.to.kind).toBe("cell");
  });

  it("walks a person back from the panel to a cell near the open one", () => {
    const board: Board = { ...settledBoard(TOOLS), at: [{ kind: "field", field: "status" }, onCell(8), onCell(15), onCell(18)] };
    const plan = planStep(board, sequence(0, 0.1, 0), view)!;
    const to = cellOf(plan.to)!;
    expect(nearCells(board.focus!, filledCells(board))).toContain(to);
  });

  it("never pairs a walker with one away from the board", () => {
    const board: Board = { ...settledBoard(TOOLS), at: [onCell(1), onCell(8), onCell(15), { kind: "tool", tool: 2 }] };
    // Walker 2 (a person), no errand, a nearby cell, a pair wanted: the only agent on the board is walker 1.
    const plan = planStep(board, sequence(0.5, 0.9, 0, 0.1), view)!;
    expect(plan.at[3]).toEqual({ kind: "tool", tool: 2 });
    expect(plan.at[1]).toEqual(plan.to);
  });
});

describe("rehome", () => {
  it("sends a walker standing in a panel that is not shown back to a filled cell", () => {
    const board: Board = { ...settledBoard(TOOLS), at: [{ kind: "field", field: "owner" }, onCell(8), onCell(15), onCell(18)] };
    const moved = rehome(board, sequence(0), false)!;
    expect(moved[0]).toEqual(onCell(FILLS[0]!));
    expect(moved.slice(1)).toEqual(board.at.slice(1));
    expect(rehome(board, sequence(0), true)).toBeNull();
    expect(rehome(settledBoard(TOOLS), sequence(0), false)).toBeNull();
  });
});

describe("nextStatus", () => {
  it("picks a status that reads differently from the one shown", () => {
    const statuses = ["Live", "Built", "Planned", "Live"];
    for (const r of [0, 0.4, 0.99]) expect(statuses[nextStatus(0, statuses, () => r)]).not.toBe("Live");
  });
});

describe("the loop's clock", () => {
  const clock = { soloAt: 1000, openSince: 2000, lastOpen: 3000 };

  it("opens a new cell at most once per cooldown", () => {
    expect(mayOpen(clock, 3000 + TIMING.cooldown - 1)).toBe(false);
    expect(mayOpen(clock, 3000 + TIMING.cooldown)).toBe(true);
  });

  it("lets the board stand alone a while before a person opens the panel", () => {
    expect(personOpens(true, clock, 1000 + TIMING.soloGrace - 1)).toBe(false);
    expect(personOpens(true, clock, 1000 + TIMING.soloGrace)).toBe(true);
    expect(personOpens(false, clock, 1001)).toBe(true);
  });

  it("closes the panel again once it has been open long enough", () => {
    expect(panelExpired(false, clock, 2000 + TIMING.panelLife)).toBe(false);
    expect(panelExpired(false, clock, 2001 + TIMING.panelLife)).toBe(true);
    expect(panelExpired(true, clock, 1e9)).toBe(false);
  });
});

describe("soloScale", () => {
  it("grows the board into the panel's room", () => {
    expect(soloScale({ board: 500, gap: 37, panel: 240, stageHeight: 1000, sheetHeight: 300 })).toBeCloseTo(1.554);
  });

  it("as far as the frame's height allows, and never smaller", () => {
    expect(soloScale({ board: 500, gap: 37, panel: 240, stageHeight: 400, sheetHeight: 300 })).toBeCloseTo(344 / 318);
    expect(soloScale({ board: 500, gap: 37, panel: 240, stageHeight: 200, sheetHeight: 300 })).toBe(1);
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

describe("walkers", () => {
  const walker = { width: 22, height: 22 };
  const frame = { width: 1000, height: 600 };

  it("stand side by side when they share a place", () => {
    expect(slotsOf([onCell(3), onCell(3), onCell(5), onCell(3)])).toEqual([0, 1, 0, 2]);
    expect(slotsOf([{ kind: "tool", tool: 1 }, { kind: "tool", tool: 1 }, onCell(1), null])).toEqual([0, 1, 0, 0]);
  });

  it("stand on the top edge, in from the right corner", () => {
    const cell = rect(100, 40, 70, 52);
    const spot = walkerSpot(cell, 0, walker, frame, null);
    expect(spot.x).toBe(157);
    expect(spot.y).toBeCloseTo(30.76);
    expect(walkerSpot(cell, 1, walker, frame, null).x).toBe(140);
  });

  it("stay inside the frame", () => {
    expect(walkerSpot(rect(-40, 2, 30, 30), 0, walker, frame, null)).toEqual({ x: 4, y: 4 });
    expect(walkerSpot(rect(990, 590, 40, 40), 0, walker, frame, null)).toEqual({ x: 974, y: 574 });
  });

  it("stay inside the panel when they stop on one of its fields", () => {
    expect(walkerSpot(rect(800, 200, 200, 20), 0, walker, frame, 960).x).toBe(928);
  });
});

describe("projection", () => {
  const stage = rect(10, 20, 1000, 600);
  const cell = rect(300, 200, 70, 52);
  const panel = rect(700, 100, 250, 450);

  it("runs from the cell's right edge to the panel's left edge", () => {
    const light = projection(stage, cell, panel);
    expect(light.points).toBe("360,180 690,96 690,514 360,232");
    expect(light.edges).toEqual([
      { x1: 360, y1: 180, x2: 690, y2: 96 },
      { x1: 360, y1: 232, x2: 690, y2: 514 },
    ]);
    expect(light.from).toBe("inset(0 640px 0 0)");
    expect(light.to).toBe("inset(0 309px 0 0)");
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
