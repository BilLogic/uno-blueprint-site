import { describe, expect, it } from "vitest";
import { inSlice, nextSlice, type SliceKind } from "./harness-slice";

/** The cells a kind picks on a four-lane, six-step board, as "lane,step". */
const picked = (kind: SliceKind) =>
  Array.from({ length: 4 }, (_, lane) =>
    Array.from({ length: 6 }, (_, step) => (inSlice(kind, lane, step) ? [`${lane},${step}`] : [])),
  ).flat(2);

describe("inSlice", () => {
  it("picks the user's whole journey", () => {
    expect(picked("journey")).toEqual(["0,0", "0,1", "0,2", "0,3", "0,4", "0,5"]);
  });

  it("picks one lane, one step or one cell", () => {
    expect(picked("lane")).toHaveLength(6);
    expect(picked("lane").every((c) => c.startsWith("2,"))).toBe(true);
    expect(picked("step")).toEqual(["0,2", "1,2", "2,2", "3,2"]);
    expect(picked("cell")).toEqual(["2,4"]);
  });

  it("picks a custom set across lanes", () => {
    expect(picked("custom")).toEqual(["0,1", "1,3", "2,5", "3,3"]);
  });
});

describe("nextSlice", () => {
  it("moves on and wraps round", () => {
    expect(nextSlice(0, 5)).toBe(1);
    expect(nextSlice(4, 5)).toBe(0);
  });
});
