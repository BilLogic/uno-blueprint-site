/**
 * How the harness pictures replay: each plays through, holds its last frame,
 * and plays again from the start, but only while the stage is on screen.
 */

/** How long a finished picture holds its last frame before it plays again (ms). */
export const HARNESS_HOLD = 2500;

export type HarnessLoop = {
  /** Bumped to start the picture again from its first frame. */
  run: number;
  /** Whether the stage is on screen; the picture plays only then. */
  shown: boolean;
  /** The picture has finished and holds its last frame. */
  holding: boolean;
};

/**
 * `shown` and `hidden` follow the stage on and off screen, `done` comes from a
 * picture that has finished, `held` once the hold is over, and `restart` from
 * a new tab or a picture whose layout moved under it.
 */
export type HarnessLoopEvent = "shown" | "hidden" | "done" | "held" | "restart";

export const HARNESS_LOOP_START: HarnessLoop = { run: 0, shown: false, holding: false };

export function harnessLoop(loop: HarnessLoop, event: HarnessLoopEvent): HarnessLoop {
  switch (event) {
    case "shown":
      // Back on screen, the picture plays from the start.
      return loop.shown ? loop : { run: loop.run + 1, shown: true, holding: false };
    case "hidden":
      return loop.shown || loop.holding ? { ...loop, shown: false, holding: false } : loop;
    case "done":
      return loop.shown && !loop.holding ? { ...loop, holding: true } : loop;
    case "held":
      return loop.holding ? { ...loop, run: loop.run + 1, holding: false } : loop;
    case "restart":
      return { ...loop, run: loop.run + 1, holding: false };
  }
}
