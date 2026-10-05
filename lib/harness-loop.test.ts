import { describe, expect, it } from "vitest";
import { HARNESS_LOOP_START, harnessLoop, type HarnessLoopEvent } from "./harness-loop";

const after = (...events: HarnessLoopEvent[]) => events.reduce(harnessLoop, HARNESS_LOOP_START);

describe("harnessLoop", () => {
  it("waits off screen, and plays from the start once shown", () => {
    expect(HARNESS_LOOP_START).toEqual({ run: 0, shown: false, holding: false });
    expect(after("shown")).toEqual({ run: 1, shown: true, holding: false });
  });

  it("holds a finished picture, then plays it again", () => {
    expect(after("shown", "done")).toEqual({ run: 1, shown: true, holding: true });
    expect(after("shown", "done", "held")).toEqual({ run: 2, shown: true, holding: false });
    expect(after("shown", "done", "held", "done", "held").run).toBe(3);
  });

  it("stops looping off screen, and starts over when back", () => {
    expect(after("shown", "done", "hidden")).toEqual({ run: 1, shown: false, holding: false });
    // A hold that ends after the stage has gone does nothing.
    expect(after("shown", "done", "hidden", "held").run).toBe(1);
    expect(after("shown", "hidden", "shown")).toEqual({ run: 2, shown: true, holding: false });
  });

  it("ignores a picture finishing off screen", () => {
    expect(after("done")).toEqual(HARNESS_LOOP_START);
  });

  it("leaves the state alone when nothing changes", () => {
    const shown = after("shown");
    expect(harnessLoop(shown, "shown")).toBe(shown);
    expect(harnessLoop(HARNESS_LOOP_START, "hidden")).toBe(HARNESS_LOOP_START);
  });

  it("starts over on a restart, dropping any hold", () => {
    expect(after("shown", "done", "restart")).toEqual({ run: 2, shown: true, holding: false });
    expect(after("shown", "done", "restart", "held").run).toBe(2);
  });
});
