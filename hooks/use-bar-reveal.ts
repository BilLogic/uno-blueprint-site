"use client";

import { useCallback, useEffect, useState } from "react";
import { barProgress, isBarFull, phoneReveal, phoneRevealDue } from "@/lib/proof-chart";
import { useMediaQuery, useReducedMotion } from "./use-media-query";

const sameFlags = (a: readonly boolean[], b: readonly boolean[]) =>
  a.length === b.length && a.every((flag, i) => flag === b[i]);

/**
 * Grows a bar chart's pairs as the reader scrolls. Each pair (an element with
 * `data-pair`, holding its baseline as `data-baseline`) gets `--p`, how far its
 * bars have grown, and `--d`, how long they wait before growing. On a wide
 * screen `--p` follows each baseline up the screen; on a phone the chart is
 * revealed whole, once, pair after pair. Returns, per pair, whether it has grown
 * enough to show its values.
 */
export function useBarReveal<T extends HTMLElement>(
  pairs: number,
): [ref: (node: T | null) => void, full: readonly boolean[]] {
  const [chart, setChart] = useState<T | null>(null);
  const [full, setFull] = useState<readonly boolean[]>(() => Array<boolean>(pairs).fill(false));
  const reduced = useReducedMotion();
  const phone = useMediaQuery("(max-width: 760px)");

  useEffect(() => {
    if (!chart) return;
    const root = chart;
    const groups = [...root.querySelectorAll<HTMLElement>("[data-pair]")];
    const baselines = groups.map((group) => group.querySelector<HTMLElement>("[data-baseline]"));
    const timers: number[] = [];
    let frame = 0;
    let revealed = false;

    function revealOnce() {
      if (revealed) return;
      if (!reduced && !phoneRevealDue(root.getBoundingClientRect().top, innerHeight)) return;
      revealed = true;
      groups.forEach((group, i) => {
        const { growDelayMs, valuesAtMs } = reduced ? { growDelayMs: 0, valuesAtMs: 0 } : phoneReveal(i);
        group.style.setProperty("--d", `${growDelayMs}ms`);
        group.style.setProperty("--p", "1");
        timers.push(
          window.setTimeout(() => setFull((was) => was.map((flag, j) => flag || j === i)), valuesAtMs),
        );
      });
    }

    function follow() {
      const next = groups.map((group, i) => {
        const baseline = baselines[i]?.getBoundingClientRect().bottom ?? innerHeight;
        const progress = reduced ? 1 : barProgress(baseline, innerHeight);
        group.style.setProperty("--d", "0s");
        group.style.setProperty("--p", progress.toFixed(3));
        return isBarFull(progress);
      });
      setFull((was) => (sameFlags(was, next) ? was : next));
    }

    const update = () => {
      frame = 0;
      if (phone) revealOnce();
      else follow();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    schedule();
    return () => {
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      for (const timer of timers) clearTimeout(timer);
    };
  }, [chart, phone, reduced]);

  const ref = useCallback((node: T | null) => setChart(node), []);
  return [ref, full];
}
