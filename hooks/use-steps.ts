"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./use-media-query";

/**
 * How many steps of a timeline have passed. Step i passes `times[i]` ms after
 * `running` turns true, calling `onStep(i)` first for anything that has to be
 * measured or started at that moment, and `onDone` once the last has passed.
 * With reduced motion every step has passed at once and neither runs. To play
 * again, remount the caller.
 */
export function useSteps(
  times: readonly number[],
  running: boolean,
  onStep?: (step: number) => void,
  onDone?: () => void,
): number {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  const latestOnStep = useRef(onStep);
  const latestOnDone = useRef(onDone);
  useEffect(() => {
    latestOnStep.current = onStep;
    latestOnDone.current = onDone;
  });

  useEffect(() => {
    if (!running || reduced) return;
    const timers = times.map((at, step) =>
      setTimeout(() => {
        try {
          latestOnStep.current?.(step);
        } finally {
          // A step that fails to measure still passes, so the picture never stalls.
          setCount((passed) => Math.max(passed, step + 1));
        }
        if (step === times.length - 1) latestOnDone.current?.();
      }, at),
    );
    return () => timers.forEach(clearTimeout);
  }, [times, running, reduced]);

  return reduced ? times.length : count;
}
