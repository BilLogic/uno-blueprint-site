"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { isGliding } from "@/hooks/glide-signal";
import { keyScrollsPage } from "@/lib/glide";
import { advanceMorph } from "@/lib/walkthrough-morph";
import {
  STEP,
  TIMING,
  WHEEL_START,
  gateHold,
  gateReleases,
  gestureBase,
  goalStep,
  introTriggered,
  morphHeading,
  nextStep,
  noteWheel,
  scrollProgress,
  showFor,
  stepHold,
  wheelStop,
  wheelPixels,
  type GateGesture,
  type GateScroll,
} from "@/lib/walkthrough";

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
 * the next step (see `gestureBase` and `gateHold`). A held step lets go once
 * it has had time to show and a new swipe has begun (see `showFor`,
 * `gateReleases` and `noteWheel`), so scrolling on is never fought. A wheel
 * that would carry the page past that step is stopped before it moves, and
 * the page rests where it would have been held (see `wheelStop`), so it never
 * jumps down and back where the walkthrough lets go; the hold after the scroll
 * stays for the rest, a touch's momentum or a scrolling key. Scrolling
 * up is free, and so is a scroll no gesture made (a jump to an anchor, focus
 * moving), so the page can always be taken anywhere.
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
    // touched the page, whether a gesture is running, and what it holds: the step
    // it counts from (`null`: free), when it may be let go, and where it is held.
    let lastY = scrollY;
    let lastInput = -Infinity;
    let gesturing = false;
    let gesture: GateGesture = { base: null, freeAt: 0, since: 0 };
    let heldY = -1;
    let stillTimer = 0;
    // When the latest swipe began: a wheel turning or speeding up again, a finger landing, a key pressed.
    let wheel = WHEEL_START;
    let swipeAt = 0;
    // Set while a glide skips the reads, so the first read after it starts afresh from where it ended.
    let glided = false;
    // The gesture is still while the page is: this long after the last scroll the reader made, or a wheel stopped.
    const keepGesture = () => {
      clearTimeout(stillTimer);
      stillTimer = window.setTimeout(() => {
        gesturing = false;
        heldY = -1;
      }, TIMING.gateIdle);
    };
    // The pinned scroll as it stands, or `null` while the walkthrough is not laid out.
    const pinnedScroll = (): GateScroll | null => {
      const section = scroller.current;
      const pinned = sticky.current;
      if (!section || !pinned) return null;
      const stickyTop = parseFloat(getComputedStyle(pinned).top) || 0;
      const rect = section.getBoundingClientRect();
      const scroll = { start: rect.top + scrollY - stickyTop, travel: rect.height - pinned.offsetHeight };
      return scroll.travel > 0 ? scroll : null;
    };
    const onWheel = (event: WheelEvent) => {
      const now = performance.now();
      lastInput = now;
      wheel = noteWheel(wheel, event.deltaY, now);
      swipeAt = Math.max(swipeAt, wheel.newAt);
      // A pinch zooms the page (a wheel with ctrl held); only a scroll down is stopped.
      if (event.deltaY <= 0 || event.ctrlKey || glided || isGliding()) return;
      const scroll = pinnedScroll();
      if (!scroll) return;
      const y = scrollY;
      // A wheel starts a gesture, or counts a running one afresh, from where the page is before it moves (see `gate`).
      if (!gesturing || gateReleases(gesture, now, swipeAt)) {
        gesturing = true;
        gesture = { base: gestureBase(y, scroll, edges), freeAt: 0, since: now };
        lastY = y;
      }
      if (gesture.base === null) return;
      const rest = wheelStop(gesture.base, y, wheelPixels(event.deltaY, event.deltaMode, innerHeight), scroll, edges);
      if (rest === null) return;
      // Stopped before it moves, so the page never runs past the step and back; it rests where the hold would put it.
      event.preventDefault();
      keepGesture();
      if (!gesture.freeAt) gesture = { ...gesture, freeAt: now + showFor(gesture.base + 1, edges.length), since: now };
      heldY = rest;
      if (Math.round(y) !== rest) {
        scrollTo({ top: rest, behavior: "instant" });
        lastY = rest;
      }
    };
    const onTouchStart = () => {
      swipeAt = performance.now();
    };
    const onTouchMove = () => {
      lastInput = performance.now();
    };
    const onKey = (event: KeyboardEvent) => {
      if (!keyScrollsPage(event.key)) return;
      lastInput = performance.now();
      if (!event.repeat) swipeAt = lastInput;
    };
    const gate = (section: HTMLElement, pinned: HTMLElement, stickyTop: number) => {
      const y = scrollY;
      const was = lastY;
      lastY = y;
      // During a glide, and on the first read after it, the gate stands aside: even a read queued before the glide began.
      if (glided || isGliding()) {
        glided = isGliding();
        gesturing = false;
        return;
      }
      // The page's own jump back to a held step is not the reader scrolling, so it does not keep the gesture alive.
      if (Math.round(y) !== heldY) keepGesture();
      const rect = section.getBoundingClientRect();
      const scroll = { start: rect.top + y - stickyTop, travel: rect.height - pinned.offsetHeight };
      if (scroll.travel <= 0) return;
      const now = performance.now();
      // A gesture starts, or a running one counts afresh from where the page was (see `gateReleases`).
      if (gesturing ? gateReleases(gesture, now, swipeAt) : now - lastInput <= TIMING.gestureInput) {
        gesturing = true;
        gesture = { base: gestureBase(was, scroll, edges), freeAt: 0, since: now };
      }
      if (!gesturing || gesture.base === null || y <= was) return;
      const to = gesture.base + 1;
      const hold = gateHold(gesture.base, y, scroll, edges);
      if (hold === null || hold >= y) return;
      heldY = hold;
      if (!gesture.freeAt) gesture = { ...gesture, freeAt: now + showFor(to, edges.length), since: now };
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
    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchmove", onTouchMove, { passive: true });
    addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(morphFrame);
      clearTimeout(settle);
      clearTimeout(hold);
      clearTimeout(stillTimer);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", onResize);
      removeEventListener("wheel", onWheel);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchmove", onTouchMove);
      removeEventListener("keydown", onKey);
    };
  }, [scroller, sticky, edges, held, morph]);

  return held ? { step: last, previous: last } : change;
}
