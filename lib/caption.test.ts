import { describe, expect, it } from "vitest";
import { captionDelays } from "./caption";

describe("captionDelays", () => {
  it("staggers each line's words 30 ms apart, after the title", () => {
    expect(captionDelays([3, 2], 1)).toEqual([
      [30, 60, 90],
      [30, 60],
    ]);
  });

  it("runs right to left going back", () => {
    expect(captionDelays([3], -1)).toEqual([[90, 60, 30]]);
  });

  it("starts a long line's last word no more than 120 ms after its first", () => {
    const [line] = captionDelays([13], 1);
    expect(line![0]).toBe(30);
    expect(line!.at(-1)).toBe(150);
  });

  it("gives a one-word line the first delay", () => {
    expect(captionDelays([1], 1)).toEqual([[30]]);
    expect(captionDelays([], 1)).toEqual([]);
  });
});
