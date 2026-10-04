import { describe, expect, it } from "vitest";
import { mapColumns, mapFrame, mapLinks, mapSteps, type Box } from "./harness-map";

const placements = [
  { lane: 0, step: 0 },
  { lane: 1, step: 2 },
  { lane: 1, step: 0 },
];
const order = [0, 2, 1];
const steps = mapSteps(order);

describe("mapSteps", () => {
  it("reads, opens and places each phrase in turn, then finishes", () => {
    expect(steps.map((s) => (s.kind === "end" ? "end" : `${s.kind} ${s.phrase}`))).toEqual([
      "read 0",
      "open 0",
      "place 0",
      "read 2",
      "open 2",
      "place 2",
      "read 1",
      "open 1",
      "place 1",
      "end",
    ]);
  });

  it("keeps the prototype's timing", () => {
    expect(steps.slice(0, 4).map((s) => s.at)).toEqual([500, 960, 1460, 1650]);
    expect(steps.at(-1)?.at).toBe(500 + 3 * 1150 + 600);
  });

  it("is in time order", () => {
    const times = steps.map((s) => s.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe("mapFrame", () => {
  const frame = (count: number, stacked = false) => mapFrame(steps, count, placements, stacked, 4, 3);

  it("starts with an empty board", () => {
    const f = frame(0);
    expect(f.lanes).toEqual([false, false, false, false]);
    expect(f.steps).toEqual([false, false, false]);
    expect(f.read.size + f.placed.size).toBe(0);
  });

  it("opens a lane and a step only once a phrase calls for them", () => {
    expect(frame(1).lanes).toEqual([false, false, false, false]);
    expect(frame(2).lanes).toEqual([true, false, false, false]);
    expect(frame(2).steps).toEqual([true, false, false]);
    expect(frame(8).steps).toEqual([true, false, true]);
  });

  it("marks only the phrase just placed", () => {
    expect(frame(3).latest).toBe(0);
    expect(frame(6).latest).toBe(2);
    expect(frame(6).placed).toEqual(new Set([0, 2]));
  });

  it("ends on the finished board, with every phrase placed and no cell marked", () => {
    const end = frame(steps.length);
    expect(end.latest).toBeNull();
    expect(end.placed).toEqual(new Set([0, 1, 2]));
  });

  it("lays the whole board out up front when stacked, and pings per phrase", () => {
    expect(frame(0, true).lanes).toEqual([true, true, true, true]);
    expect(frame(0, true).steps).toEqual([true, true, true]);
    expect(frame(4, true).pings).toBe(2);
    expect(frame(4, false).pings).toBe(0);
  });
});

describe("mapColumns", () => {
  it("gives open steps a share and closed ones none", () => {
    expect(mapColumns([true, false, true])).toBe("1fr 0fr 1fr");
  });
});

describe("mapLinks", () => {
  const box = (left: number, top: number, width: number, height: number): Box => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  });

  it("runs from the document's edge into the skill, and out to the lane", () => {
    const [into, out] = mapLinks({
      frame: box(100, 50, 1000, 500),
      doc: box(100, 100, 300, 60),
      phrase: box(200, 130, 80, 20),
      skill: box(500, 290, 80, 20),
      lane: box(700, 200, 400, 40),
    });
    // From x 302 (doc edge + 2) at the phrase's middle, to x 394 (6 short of the skill) at its middle.
    expect(into).toBe("M302 90C357.2 90 348 250 394 250");
    // From x 486 (6 past the skill) to x 596 (4 short of the lane) at the lane's middle.
    expect(out).toBe("M486 250C541 250 530 170 596 170");
  });
});
