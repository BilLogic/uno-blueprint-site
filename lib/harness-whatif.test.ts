import { describe, expect, it } from "vitest";
import { gentlest, markedToday, whatIfFrame, whatIfSteps } from "./harness-whatif";

const counts = [3, 2];
const steps = whatIfSteps(counts);

describe("whatIfSteps", () => {
  it("tries each option, traces its cells, weighs it, then suggests one", () => {
    expect(steps.map((s) => `${s.kind}@${s.at}`)).toEqual([
      "try@900",
      "trace@1200",
      "trace@1300",
      "trace@1400",
      "weigh@1620",
      // 900 + 300 + 3 * 100 + 760
      "try@2260",
      "trace@2560",
      "trace@2660",
      "weigh@2880",
      "suggest@3520",
    ]);
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
    expect(frame(0).current).toBeNull();
  });

  it("counts cells up while an option is traced", () => {
    expect(frame(3).current).toBe(0);
    expect(frame(3).options[0]).toEqual({ shown: true, traced: 2, weighed: false });
    expect(frame(5).options[0]?.weighed).toBe(true);
  });

  it("pings once per option", () => {
    expect(frame(6).pings).toBe(2);
  });

  it("suggests the gentlest option at the end", () => {
    const end = frame(steps.length);
    expect(end.suggested).toBe(1);
    expect(end.current).toBeNull();
  });
});

describe("markedToday", () => {
  const changes = [["a", "b", "c"], ["d", "e"]];

  it("marks the traced cells of the option being tried", () => {
    expect(markedToday(whatIfFrame(steps, 3, counts), changes)).toEqual(["a", "b"]);
  });

  it("marks the suggested option's cells once chosen", () => {
    expect(markedToday(whatIfFrame(steps, steps.length, counts), changes)).toEqual(["d", "e"]);
  });

  it("marks nothing before the first option", () => {
    expect(markedToday(whatIfFrame(steps, 0, counts), changes)).toEqual([]);
  });
});
