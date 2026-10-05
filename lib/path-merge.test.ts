import { describe, expect, it } from "vitest";
import { mergePaths, swapSteps } from "./path-merge";

describe("mergePaths", () => {
  it("draws a step every path shares once", () => {
    expect(
      mergePaths([
        { path: "A", steps: ["x", "y"] },
        { path: "B", steps: ["x", "y"] },
      ]),
    ).toEqual([{ step: "x" }, { step: "y" }]);
  });

  it("holds each path's own step, in the paths' order, where they part", () => {
    expect(
      mergePaths([
        { path: "A", steps: ["walks in", "y"] },
        { path: "B", steps: ["books", "y"] },
      ]),
    ).toEqual([
      {
        apart: [
          { path: "A", step: "walks in" },
          { path: "B", step: "books" },
        ],
      },
      { step: "y" },
    ]);
  });

  it("parts a slot when any one path differs", () => {
    expect(
      mergePaths([
        { path: "A", steps: ["x"] },
        { path: "B", steps: ["x"] },
        { path: "C", steps: ["z"] },
      ]),
    ).toEqual([
      {
        apart: [
          { path: "A", step: "x" },
          { path: "B", step: "x" },
          { path: "C", step: "z" },
        ],
      },
    ]);
  });

  it("lays a lone path out as it is", () => {
    expect(mergePaths([{ path: "A", steps: ["x", "y"] }])).toEqual([{ step: "x" }, { step: "y" }]);
  });

  it("has no slots without paths", () => {
    expect(mergePaths([])).toEqual([]);
  });

  it("throws when the paths differ in length", () => {
    expect(() =>
      mergePaths([
        { path: "A", steps: ["x", "y"] },
        { path: "B", steps: ["x"] },
      ]),
    ).toThrow("B has 1 steps");
  });
});

describe("swapSteps", () => {
  it("replaces the named steps and keeps the rest", () => {
    expect(swapSteps(["a", "b", "c"], { b: "B" })).toEqual(["a", "B", "c"]);
  });

  it("keeps every step when nothing is swapped", () => {
    expect(swapSteps(["a", "b"], {})).toEqual(["a", "b"]);
  });
});
