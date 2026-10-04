import { describe, expect, it } from "vitest";
import { gentlest, markedToday, whatIfFrame, whatIfSteps } from "./harness-whatif";

const counts = [3, 2];
const steps = whatIfSteps(counts);

describe("whatIfSteps", () => {
  it("drafts every option at once, traces them side by side, weighs them together, then suggests one", () => {
    expect(steps.map((s) => ("option" in s ? `${s.kind} ${s.option}.${s.cell}@${s.at}` : `${s.kind}@${s.at}`))).toEqual([
      "draft@900",
      // Cell j of every option is traced at the same moment: 900 + 300 + j * 140.
      "trace 0.0@1200",
      "trace 1.0@1200",
      "trace 0.1@1340",
      "trace 1.1@1340",
      "trace 0.2@1480",
      // The longest option sets when they are weighed: 900 + 300 + 3 * 140 + 200.
      "weigh@1820",
      "suggest@2920",
    ]);
  });

  it("is in time order", () => {
    const times = steps.map((s) => s.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe("gentlest", () => {
  it("picks the option with the fewest changed cells", () => {
    expect(gentlest([7, 3, 2])).toBe(2);
  });

  it("keeps the earlier option on a tie", () => {
    expect(gentlest([2, 5, 2])).toBe(0);
  });
});

describe("whatIfFrame", () => {
  const frame = (count: number) => whatIfFrame(steps, count, counts);

  it("starts with every slot empty", () => {
    expect(frame(0).options.every((o) => !o.shown)).toBe(true);
    expect(frame(0).tracing).toBe(false);
  });

  it("shows every option at once, and pings once", () => {
    const drafted = frame(1);
    expect(drafted.options.every((o) => o.shown)).toBe(true);
    expect(drafted.tracing).toBe(true);
    expect(drafted.pings).toBe(1);
  });

  it("runs each option's count up side by side", () => {
    expect(frame(3).options.map((o) => o.traced)).toEqual([1, 1]);
    expect(frame(5).options.map((o) => o.traced)).toEqual([2, 2]);
    expect(frame(6).options.map((o) => o.traced)).toEqual([3, 2]);
  });

  it("weighs every option together", () => {
    expect(frame(6).options.some((o) => o.weighed)).toBe(false);
    expect(frame(7).options.every((o) => o.weighed)).toBe(true);
    expect(frame(7).suggested).toBeNull();
  });

  it("suggests the gentlest option at the end", () => {
    const end = frame(steps.length);
    expect(end.suggested).toBe(1);
    expect(end.tracing).toBe(false);
    expect(end.pings).toBe(1);
  });
});

describe("markedToday", () => {
  const changes = [["a", "b", "c"], ["d", "e"]];

  it("marks nothing on today's board while the options are traced", () => {
    expect(markedToday(whatIfFrame(steps, 0, counts), changes)).toEqual([]);
    expect(markedToday(whatIfFrame(steps, 7, counts), changes)).toEqual([]);
  });

  it("marks the suggested option's cells once chosen", () => {
    expect(markedToday(whatIfFrame(steps, steps.length, counts), changes)).toEqual(["d", "e"]);
  });
});
