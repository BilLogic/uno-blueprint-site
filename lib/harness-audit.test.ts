import { describe, expect, it } from "vitest";
import { auditFrame, auditSteps, flightStart } from "./harness-audit";
import type { Box } from "./harness-map";

const box = (left: number, top: number, width: number, height: number): Box => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

describe("auditSteps", () => {
  it("pings, plots each finding a beat apart, then lights the corner after the last lands", () => {
    expect(auditSteps(4)).toEqual([1700, 1950, 2100, 2250, 2400, 1950 + 600 + 640 + 150]);
  });
});

describe("auditFrame", () => {
  it("plots nothing before the ping", () => {
    expect(auditFrame(4, 0)).toEqual({ pings: 0, plotted: 0, done: false });
  });

  it("plots findings one at a time after the ping", () => {
    expect(auditFrame(4, 1)).toEqual({ pings: 1, plotted: 0, done: false });
    expect(auditFrame(4, 3)).toEqual({ pings: 1, plotted: 2, done: false });
  });

  it("lights the corner only once every finding is in", () => {
    expect(auditFrame(4, 5).done).toBe(false);
    expect(auditFrame(4, 6)).toEqual({ pings: 1, plotted: 4, done: true });
  });
});

describe("flightStart", () => {
  const skill = box(100, 100, 80, 30);

  it("leaves from the skill's right edge when the graph is beside it", () => {
    // Start (188, 115); the dot's centre is (406, 56).
    expect(flightStart(skill, box(400, 50, 12, 12))).toEqual({ x: 188 - 406, y: 115 - 56 });
  });

  it("leaves from the skill's foot when the graph is below it", () => {
    // Start (140, 138); the dot's centre is (66, 406).
    expect(flightStart(skill, box(60, 400, 12, 12))).toEqual({ x: 140 - 66, y: 138 - 406 });
  });
});
