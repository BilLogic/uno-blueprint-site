"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { isGliding } from "@/hooks/glide-signal";
import { advanceMorph } from "@/lib/walkthrough-morph";
import { STEP, TIMING, goalStep, introTriggered, morphHeading, nextStep, scrollProgress, stepHold } from "@/lib/walkthrough";

export type StepChange = { step: number; previous: number };

/** The opening morph's progress (0 to 1), and how to draw the cards at a progress. */
export type Morph = { progress: number; draw: (progress: number) => void };

/**
 * Which step of the pinned walkthrough is showing, and the one shown before
 * it. `scroller` is the tall section, `sticky` the frame pinned inside it at
 * its own `top`; `edges` end each step (see `stepEdges`).
 *
 * The scroll sets a goal, and the walkthrough walks to it one step at a time,
 * holding each step as long as its choreography needs (see `stepHold`); left
 * further behind by a fast scroll, it jumps to the goal (see `nextStep`).
 * `toEnd` jumps it to the last step at once, the morph finished on the way,
 * for the hold at the section's end (see `useExitHold`). Past a buffer into the
 * opening step, the morph of `morph` plays forward on its own clock, and the
 * opening step is left only once it has finished. Above the buffer it plays
 * back, but only once the walkthrough has walked back to the opening step
 * (see `morphHeading`). While `held`, scrolling is ignored and the last step
 * shows. While an in-page link glides past (see `isGliding`), the scroll is not
 * read; the glide announces a scroll as it ends, and the walkthrough reads it then.
 */
export function useScrollStep(
  scroller: RefObject<HTMLElement | null>,
  sticky: RefObject<HTMLElement | null>,
  edges: readonly number[],
  held: boolean,
  morph: RefObject<Morph>,
): { change: StepChange; toEnd: RefObject<() => void> } {
  const [change, setChange] = useState<StepChange>({ step: 0, previous: -1 });
  const current = useRef(0);
  const toEnd = useRef(() => {});
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
      // Back on the opening step: read again, so the cards play back if the scroll is above the trigger.
      if (to === STEP.context) schedule();
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

    toEnd.current = () => {
      const from = current.current;
      const end = edges.length - 1;
      if (from === end) return;
      // The cards become the stack at once, so the walkthrough may leave the opening step.
      cancelAnimationFrame(morphFrame);
      morphFrame = 0;
      forward = true;
      m.progress = 1;
      m.draw(1);
      clearTimeout(hold);
      hold = 0;
      goal = end;
      current.current = end;
      setChange({ step: end, previous: from });
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
      const heading = morphHeading(introTriggered(progress, edges), current.current);
      if (heading !== "hold") playMorph(heading === "forward");
    };
    // Hoisted, so the stepping and the morph's clock above can ask for a fresh read.
    function schedule() {
      if (!frame && !isGliding()) frame = requestAnimationFrame(read);
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
      toEnd.current = () => {};
      cancelAnimationFrame(frame);
      cancelAnimationFrame(morphFrame);
      clearTimeout(settle);
      clearTimeout(hold);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", onResize);
    };
  }, [scroller, sticky, edges, held, morph]);

  return { change: held ? { step: last, previous: last } : change, toEnd };
}
