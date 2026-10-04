"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { advanceMorph } from "@/lib/walkthrough-morph";
import { TIMING, goalStep, introTriggered, nextStep, scrollProgress, stepHold } from "@/lib/walkthrough";

export type StepChange = { step: number; previous: number };

/** The opening morph's progress (0 to 1), and how to draw the cards at a progress. */
export type Morph = { progress: number; draw: (progress: number) => void };

/**
 * Which step of the pinned walkthrough is showing, and the one shown before
 * it. `scroller` is the tall section, `sticky` the frame pinned inside it at
 * its own `top`; `edges` end each step (see `stepEdges`).
 *
 * The scroll sets a goal, and the walkthrough walks to it one step at a time,
 * holding each step as long as its choreography needs (see `stepHold`), so no
 * step is skipped however fast the page scrolls. Past a buffer into the
 * opening step, the morph of `morph` plays on its own clock, forward, or back
 * once the reader scrolls above the buffer again; the opening step is left
 * only once it has finished. While `held`, scrolling is ignored and the last
 * step shows.
 */
export function useScrollStep(
  scroller: RefObject<HTMLElement | null>,
  sticky: RefObject<HTMLElement | null>,
  edges: readonly number[],
  held: boolean,
  morph: RefObject<Morph>,
): StepChange {
  const [change, setChange] = useState<StepChange>({ step: 0, previous: -1 });
  const current = useRef(0);
  const last = edges.length - 1;

  useEffect(() => {
    if (held) return;
    const m = morph.current;
    let frame = 0;
    let settle = 0;
    let hold = 0;
    let goal = current.current;

    // One step toward the goal, then a hold before the next.
    const advance = () => {
      hold = 0;
      const from = current.current;
      const to = nextStep(from, goal, m.progress === 1);
      if (to === from) return;
      current.current = to;
      setChange({ step: to, previous: from });
      if (to !== goal) hold = window.setTimeout(advance, stepHold(from, to));
    };
    const seek = (step: number) => {
      goal = step;
      if (!hold) advance();
    };

    let morphFrame = 0;
    let forward = false;
    let lastTick = 0;
    const tick = (now: number) => {
      m.progress = advanceMorph(m.progress, forward, now - lastTick);
      lastTick = now;
      m.draw(m.progress);
      morphFrame = m.progress === (forward ? 1 : 0) ? 0 : requestAnimationFrame(tick);
      // Once the stack has formed, the walkthrough may move on.
      if (!morphFrame && m.progress === 1) schedule();
    };
    const playMorph = (toEnd: boolean) => {
      if (toEnd === forward && (morphFrame || m.progress === (toEnd ? 1 : 0))) return;
      forward = toEnd;
      if (!morphFrame) {
        lastTick = performance.now();
        morphFrame = requestAnimationFrame(tick);
      }
    };

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
      seek(goalStep(progress, edges, m.progress === 1));
      playMorph(introTriggered(progress, edges));
    };
    // Hoisted, so the morph's clock above can ask for a fresh read once the stack has formed.
    function schedule() {
      if (!frame) frame = requestAnimationFrame(read);
    }
    // A resize refits the frame first (after TIMING.resizeSettle), so the step is read just after that.
    const onResize = () => {
      clearTimeout(settle);
      settle = window.setTimeout(schedule, TIMING.resizeSettle + 30);
    };
    schedule();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(morphFrame);
      clearTimeout(settle);
      clearTimeout(hold);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", onResize);
    };
  }, [scroller, sticky, edges, held, morph]);

  return held ? { step: last, previous: last } : change;
}
