"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { isGliding } from "@/hooks/glide-signal";
import { keyScrollsPage } from "@/lib/glide";
import { advanceMorph } from "@/lib/walkthrough-morph";
import {
  STEP,
  TIMING,
  gateHold,
  gestureBase,
  goalStep,
  introTriggered,
  morphHeading,
  nextStep,
  scrollProgress,
  stepHold,
} from "@/lib/walkthrough";

export type StepChange = { step: number; previous: number };

/**
 * A scroll that starts this soon after a wheel, a touch or a scrolling key, in
 * ms, is that gesture's; later, nothing the reader did set it going. Generous,
 * so a busy page that reads the scroll a few frames late still gates it.
 */
const GESTURE_INPUT_WINDOW = 600;

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
 * opening step, the morph of `morph` plays forward on its own clock, and the
 * opening step is left only once it has finished. Above the buffer it plays
 * back, but only once the walkthrough has walked back to the opening step
 * (see `morphHeading`). While `held`, scrolling is ignored and the last step
 * shows. While an in-page link glides past (see `isGliding`), the scroll is not
 * read; the glide announces a scroll as it ends, and the walkthrough reads it then.
 *
 * A downward gesture (a wheel, a touch or a scrolling key, and the scroll it
 * sets going, until the page has been still for `TIMING.gateIdle`) moves the
 * walkthrough one step, however hard the flick: the page is held just inside
 * the next step (see `gestureBase` and `gateHold`). Scrolling up is free, and
 * so is a scroll no gesture made (a jump to an anchor, focus moving), so the
 * page can always be taken anywhere.
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

    // The gesture gate: where the page was at the last read, when the reader last
    // touched the page, and the step the running gesture counts from (`null`: free).
    let lastY = scrollY;
    let lastInput = -Infinity;
    let gesturing = false;
    let base: number | null = null;
    let still = 0;
    // Set while a glide skips the reads, so the first read after it starts afresh from where it ended.
    let glided = false;
    const touched = () => {
      lastInput = performance.now();
    };
    const keyed = (event: KeyboardEvent) => {
      if (keyScrollsPage(event.key)) touched();
    };
    const gate = (section: HTMLElement, pinned: HTMLElement, stickyTop: number) => {
      const y = scrollY;
      const was = lastY;
      lastY = y;
      if (glided) {
        glided = false;
        return;
      }
      clearTimeout(still);
      still = window.setTimeout(() => {
        gesturing = false;
      }, TIMING.gateIdle);
      const rect = section.getBoundingClientRect();
      const scroll = { start: rect.top + y - stickyTop, travel: rect.height - pinned.offsetHeight };
      if (scroll.travel <= 0) return;
      if (!gesturing) {
        if (performance.now() - lastInput > GESTURE_INPUT_WINDOW) return;
        gesturing = true;
        base = gestureBase(was, scroll, edges);
      }
      if (base === null || y <= was) return;
      const hold = gateHold(base, y, scroll, edges);
      if (hold === null) return;
      scrollTo({ top: hold, behavior: "instant" });
      lastY = hold;
    };

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

    const read = () => {
      frame = 0;
      const section = scroller.current;
      const pinned = sticky.current;
      if (!section || !pinned) return;
      const stickyTop = parseFloat(getComputedStyle(pinned).top) || 0;
      gate(section, pinned, stickyTop);
      const rect = section.getBoundingClientRect();
      const progress = scrollProgress({
        stickyTop,
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
      if (isGliding()) glided = true;
      else if (!frame) frame = requestAnimationFrame(read);
    }
    // A resize refits the frame first (after TIMING.resizeSettle), so the step is read just after that.
    const onResize = () => {
      clearTimeout(settle);
      settle = window.setTimeout(schedule, TIMING.resizeSettle + 30);
    };
    schedule();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", onResize);
    addEventListener("wheel", touched, { passive: true });
    addEventListener("touchmove", touched, { passive: true });
    addEventListener("keydown", keyed);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(morphFrame);
      clearTimeout(settle);
      clearTimeout(hold);
      clearTimeout(still);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", onResize);
      removeEventListener("wheel", touched);
      removeEventListener("touchmove", touched);
      removeEventListener("keydown", keyed);
    };
  }, [scroller, sticky, edges, held, morph]);

  return held ? { step: last, previous: last } : change;
}
