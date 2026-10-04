import { describe, expect, it } from "vitest";
import { laneByKey, stepWindow } from "./journey-reader";

describe("stepWindow", () => {
  it("centres the lit step where it can", () => {
    expect(stepWindow(6, 3, 4)).toEqual({ start: 1, end: 5 });
  });

  it("starts at the first step when the lit one is near the top", () => {
    expect(stepWindow(6, 0, 4)).toEqual({ start: 0, end: 4 });
  });

  it("ends at the last step when the lit one is near the bottom", () => {
    expect(stepWindow(6, 5, 4)).toEqual({ start: 2, end: 6 });
  });

  it("shows every step when there are no more than fit", () => {
    expect(stepWindow(3, 1, 4)).toEqual({ start: 0, end: 3 });
  });

  it("starts at the top when no step is lit", () => {
    expect(stepWindow(6, -1, 4)).toEqual({ start: 0, end: 4 });
  });
});

describe("laneByKey", () => {
  const lanes = [
    { key: "user", steps: ["a"] },
    { key: "front", steps: ["b"] },
  ] as const;

  it("finds a lane by its key, wherever it sits", () => {
    expect(laneByKey(lanes, "front")).toBe(lanes[1]);
  });

  it("throws when no lane has the key", () => {
    expect(() => laneByKey(lanes as readonly { key: string }[], "back")).toThrow("back");
  });
});
