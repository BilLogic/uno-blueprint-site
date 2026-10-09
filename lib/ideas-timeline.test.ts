import { describe, expect, it } from "vitest";
import {
  drawHeights,
  initials,
  lengthAtHeight,
  newTabProps,
  nodePoints,
  railPath,
  reachedCount,
} from "./ideas-timeline";

describe("nodePoints", () => {
  const cards = [
    { top: 0, left: 0, right: 445 },
    { top: 94, left: 595, right: 1040 },
  ];

  it("swings the line either side of the middle, level with each card's head, with an arm to its near edge", () => {
    expect(nodePoints(cards, 1040)).toEqual([
      { x: 484, y: 34, armTo: 445 },
      { x: 556, y: 128, armTo: 595 },
    ]);
  });
});

describe("railPath", () => {
  it("enters from above the middle, curves through each node and runs on to the end", () => {
    const points = [
      { x: 484, y: 34, armTo: 445 },
      { x: 556, y: 128, armTo: 595 },
    ];
    expect(railPath(points, 520, 300)).toBe(
      "M520 -30C520 -6 484 -6 484 34" + "C484 81 556 81 556 128" + "C556 214 520 214 520 300",
    );
  });

  it("is empty with no nodes", () => {
    expect(railPath([], 520, 300)).toBe("");
  });
});

describe("lengthAtHeight", () => {
  const samples = [
    { y: -30, length: 0 },
    { y: 10, length: 50 },
    { y: 60, length: 120 },
  ];

  it("is the length drawn by the last sample at or above a height", () => {
    expect(lengthAtHeight(samples, 10)).toBe(50);
    expect(lengthAtHeight(samples, 59)).toBe(50);
    expect(lengthAtHeight(samples, 1e6)).toBe(120);
  });

  it("draws nothing above the line's start", () => {
    expect(lengthAtHeight(samples, -100)).toBe(0);
  });
});

describe("drawHeights", () => {
  it("runs the bare track ahead of the green line, both measured from the timeline's top", () => {
    expect(drawHeights(1000, 200, false)).toEqual({ track: 760, reached: 500 });
  });

  it("draws everything when the reader asks for less motion", () => {
    const { track, reached } = drawHeights(1000, 5000, true);
    expect(track).toBe(Infinity);
    expect(reached).toBe(Infinity);
  });
});

describe("reachedCount", () => {
  it("counts the nodes the green line has reached", () => {
    expect(reachedCount([34, 128, 222], 0)).toBe(0);
    expect(reachedCount([34, 128, 222], 128)).toBe(2);
    expect(reachedCount([34, 128, 222], Infinity)).toBe(3);
  });
});

describe("initials", () => {
  it("takes the first letters of the first two capitalised words", () => {
    expect(initials("Birgitta Böckeler")).toBe("BB");
    expect(initials("G. Lynn Shostack")).toBe("GL");
    expect(initials("Lavrans Løvlie, Andy Polaine and Ben Reason")).toBe("LL");
    expect(initials("Ryan Lopopolo")).toBe("RL");
  });
});

describe("newTabProps", () => {
  it("opens a ready source in a new tab, without handing it the page", () => {
    expect(newTabProps({})).toEqual({ target: "_blank", rel: "noopener noreferrer" });
  });

  it("leaves a link that is not ready yet alone", () => {
    expect(newTabProps({ notReady: true })).toBeNull();
  });
});
