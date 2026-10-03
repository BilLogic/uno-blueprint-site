import { describe, expect, it } from "vitest";
import { barProgress, isBarFull, phoneReveal, phoneRevealDue } from "./proof-chart";

describe("barProgress", () => {
  const screen = 1000;

  it("is empty while the baseline is at or below the foot of the screen", () => {
    expect(barProgress(1000, screen)).toBe(0);
    expect(barProgress(1400, screen)).toBe(0);
  });

  it("grows as the baseline climbs the lower third of the screen", () => {
    expect(barProgress(1000 - 170, screen)).toBeCloseTo(0.5);
  });

  it("is full once the baseline has climbed a third of the way up, and stays full", () => {
    expect(barProgress(1000 - 340, screen)).toBe(1);
    expect(barProgress(-200, screen)).toBe(1);
  });
});

describe("isBarFull", () => {
  it("counts a pair as grown just short of full, so its values show without a last scroll", () => {
    expect(isBarFull(0.97)).toBe(false);
    expect(isBarFull(0.971)).toBe(true);
  });
});

describe("phoneRevealDue", () => {
  it("waits until the chart's top is well into the screen", () => {
    expect(phoneRevealDue(600, 1000)).toBe(false);
    expect(phoneRevealDue(579, 1000)).toBe(true);
  });
});

describe("phoneReveal", () => {
  it("staggers the pairs and shows each pair's values once its bars are most of the way up", () => {
    expect(phoneReveal(0)).toEqual({ growDelayMs: 0, valuesAtMs: 520 });
    expect(phoneReveal(3)).toEqual({ growDelayMs: 390, valuesAtMs: 910 });
  });
});
