import { describe, expect, it } from "vitest";
import { pairReveal, revealDue } from "./proof-chart";

describe("revealDue", () => {
  const screen = 1000;

  it("waits while the chart's top is low on the screen and its foot below it", () => {
    expect(revealDue({ top: 450, bottom: 1200 }, screen)).toBe(false);
  });

  it("reveals once the chart's top is well into the screen", () => {
    expect(revealDue({ top: 449, bottom: 1200 }, screen)).toBe(true);
  });

  it("reveals a chart that is in view whole, however low it sits", () => {
    expect(revealDue({ top: 700, bottom: 976 }, screen)).toBe(false);
    expect(revealDue({ top: 700, bottom: 975 }, screen)).toBe(true);
  });
});

describe("pairReveal", () => {
  it("staggers the pairs and shows each pair's values once its bars are most of the way up", () => {
    expect(pairReveal(0)).toEqual({ growDelayMs: 0, valuesAtMs: 520 });
    expect(pairReveal(3)).toEqual({ growDelayMs: 390, valuesAtMs: 910 });
  });
});
