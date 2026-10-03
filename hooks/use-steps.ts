"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./use-media-query";

/**
 * How many steps of a timeline have passed. Step i passes `times[i]` ms after
 * `running` turns true, calling `onStep(i)` first for anything that has to be
 * measured or started at that moment. With reduced motion every step has
 * passed at once and `onStep` never runs. To play again, remount the caller.
 */
export function useSteps(
  times: readonly number[],
  running: boolean,
  onStep?: (step: number) => void,
): number {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  const latestOnStep = useRef(onStep);
  useEffect(() => {
    latestOnStep.current = onStep;
  });

  useEffect(() => {
    if (!running || reduced) return;
    const timers = times.map((at, step) =>
      setTimeout(() => {
        latestOnStep.current?.(step);
        setCount((passed) => Math.max(passed, step + 1));
      }, at),
    );
    return () => timers.forEach(clearTimeout);
  }, [times, running, reduced]);

  return reduced ? times.length : count;
}
