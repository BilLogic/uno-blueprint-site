"use client";

import { useEffect, useState, type RefObject } from "react";
import { scrollProgress, stepAt } from "@/lib/walkthrough";

export type StepChange = { step: number; previous: number };

/**
 * Which step of a pinned, scroll-driven section is showing, and the one shown
 * before it. `scroller` is the tall section, `sticky` the frame pinned inside
 * it at its own `top`; `edges` end each step (see `stepEdges`). While `held`,
 * scrolling is ignored and the last step shows.
 */
export function useScrollStep(
  scroller: RefObject<HTMLElement | null>,
  sticky: RefObject<HTMLElement | null>,
  edges: readonly number[],
  held: boolean,
): StepChange {
  const [change, setChange] = useState<StepChange>({ step: 0, previous: -1 });
  const last = edges.length - 1;

  useEffect(() => {
    if (held) return;
    let frame = 0;
    let settle = 0;
    const read = () => {
      frame = 0;
      const section = scroller.current;
      const pinned = sticky.current;
      if (!section || !pinned) return;
      const rect = section.getBoundingClientRect();
      const progress = scrollProgress({
        stickyTop: parseFloat(getComputedStyle(pinned).top) || 0,
        sectionTop: rect.top,
        sectionHeight: rect.height,
        stickyHeight: pinned.offsetHeight,
      });
      const next = stepAt(progress, edges);
      setChange((current) => (current.step === next ? current : { step: next, previous: current.step }));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    // A resize refits the frame first, so its new size is read once that has settled.
    const onResize = () => {
      clearTimeout(settle);
      settle = window.setTimeout(schedule, 150);
    };
    schedule();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", onResize);
    };
  }, [scroller, sticky, edges, held]);

  return held ? { step: last, previous: last } : change;
}
