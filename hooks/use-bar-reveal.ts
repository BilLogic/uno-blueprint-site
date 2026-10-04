"use client";

import { useCallback, useEffect, useState } from "react";
import { pairReveal, revealDue } from "@/lib/proof-chart";
import { useReducedMotion } from "./use-media-query";

/**
 * Reveals a bar chart whole, once, when it is well into view (see `revealDue`).
 * Each pair (an element with `data-pair`) gets `--p`, how far its bars have
 * grown, and `--d`, how long they wait before growing. Returns, per pair,
 * whether it has grown enough to show its values.
 */
export function useBarReveal<T extends HTMLElement>(
  pairs: number,
): [ref: (node: T | null) => void, full: readonly boolean[]] {
  const [chart, setChart] = useState<T | null>(null);
  const [full, setFull] = useState<readonly boolean[]>(() => Array<boolean>(pairs).fill(false));
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!chart) return;
    const root = chart;
    const groups = [...root.querySelectorAll<HTMLElement>("[data-pair]")];
    const timers: number[] = [];
    let frame = 0;

    function revealOnce() {
      frame = 0;
      if (!reduced && !revealDue(root.getBoundingClientRect(), innerHeight)) return;
      // Revealed for good: nothing left to follow.
      stopListening();
      groups.forEach((group, i) => {
        const { growDelayMs, valuesAtMs } = reduced ? { growDelayMs: 0, valuesAtMs: 0 } : pairReveal(i);
        group.style.setProperty("--d", `${growDelayMs}ms`);
        group.style.setProperty("--p", "1");
        timers.push(
          window.setTimeout(() => setFull((was) => was.map((flag, j) => flag || j === i)), valuesAtMs),
        );
      });
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(revealOnce);
    };

    function stopListening() {
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    }

    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    schedule();
    return () => {
      stopListening();
      cancelAnimationFrame(frame);
      for (const timer of timers) clearTimeout(timer);
    };
  }, [chart, reduced]);

  const ref = useCallback((node: T | null) => setChart(node), []);
  return [ref, full];
}
