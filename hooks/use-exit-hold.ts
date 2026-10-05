"use client";

import { useEffect, useRef, type RefObject } from "react";
import { isGliding } from "@/hooks/glide-signal";
import type { StepChange } from "@/hooks/use-scroll-step";
import { cssMs } from "@/lib/hero-picture";
import { STEP, TIMING, cellArrival, cellOpensLate, exitScroll, holdsExit, keyScroll, wheelPixels } from "@/lib/walkthrough";

/** Elements that take a scrolling key for themselves, so a key pressed in one is left alone. */
const OWN_KEYS =
  "input, textarea, select, button, summary, [contenteditable]:not([contenteditable='false']), [role=tab], [role=menuitem], [role=option], [role=slider]";
/** The hold listens only while the page is within this many screens above the exit, so the rest of the page scrolls freely. */
const NEAR_SCREENS = 3;
/** Should the panel's transition never report its end, the cell counts as open this long after it would have, in ms. */
const OPEN_SLACK = 250;

/**
 * A short hold at the end of the walkthrough. Until the last step has shown
 * and its cell has lit and opened, a wheel, a touch or a scrolling key that
 * would carry the page out of the pinned section is stopped before the page
 * moves (see `holdsExit`), for at most the cell's arrival (`cellArrival`)
 * from the first move it stops, so a scroll that runs ahead of the
 * walkthrough is held as briefly as one that waits for the cell. The page is
 * never pulled back: a wheel or key that would cross the exit brings it there
 * and no further. When the hold ends the next move goes on as usual;
 * scrolling up, a page already past the section, an in-page glide and reduced
 * motion are never held. The listeners are there only near the exit while a
 * hold could come, and a timer ends each hold, so nothing keeps the page stuck.
 *
 * `scroller` is the tall section and `sticky` the frame pinned inside it.
 */
export function useExitHold(
  scroller: RefObject<HTMLElement | null>,
  sticky: RefObject<HTMLElement | null>,
  change: StepChange,
  reduced: boolean,
) {
  const step = useRef(change.step);
  // On the last step, reached from above, until its panel has opened.
  const opening = useRef(false);
  // When the running hold first stopped a move, or null.
  const heldAt = useRef<number | null>(null);
  const update = useRef(() => {});
  const cap = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const token = (name: string) => cssMs(getComputedStyle(document.documentElement).getPropertyValue(name));
    cap.current = cellArrival({
      cellBeat: TIMING.cellBeat,
      panelDelay: token("--duration-panel-delay"),
      panelOpen: token("--duration-leave"),
    });

    const exit = (): number | null => {
      const section = scroller.current;
      const pinned = sticky.current;
      if (!section || !pinned) return null;
      const rect = section.getBoundingClientRect();
      const geometry = {
        stickyTop: parseFloat(getComputedStyle(pinned).top) || 0,
        sectionTop: rect.top,
        sectionHeight: rect.height,
        stickyHeight: pinned.offsetHeight,
      };
      return exitScroll(geometry, scrollY);
    };
    const holds = (delta: number) => {
      const at = exit();
      if (at === null || isGliding()) return false;
      const now = performance.now();
      const sinceHeld = heldAt.current === null ? null : now - heldAt.current;
      const held = holdsExit({ step: step.current, opening: opening.current, sinceHeld, cap: cap.current, delta, y: scrollY, exit: at });
      if (held && heldAt.current === null) {
        heldAt.current = now;
        // The hold's hard end: the page is free once it has lasted its cap, whatever else happens.
        window.setTimeout(update.current, cap.current);
      }
      return held;
    };
    // Held short of the exit, the page is brought to it, never past it and never back.
    const stopAtExit = (event: Event) => {
      event.preventDefault();
      const at = exit();
      if (at !== null && scrollY < at) scrollTo({ top: at, behavior: "instant" });
    };

    const onWheel = (event: WheelEvent) => {
      // A pinch zooms the page (a wheel with ctrl held); a move the browser will not let be stopped goes on.
      if (event.ctrlKey || !event.cancelable) return;
      if (holds(wheelPixels(event.deltaY, event.deltaMode, innerHeight))) stopAtExit(event);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest(OWN_KEYS)) return;
      if (holds(keyScroll(event.key, event.shiftKey, innerHeight))) stopAtExit(event);
    };
    // A finger is followed move by move; one going up scrolls the page down. Two fingers are a pinch.
    let finger: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      finger = event.touches.length === 1 ? event.touches[0]!.clientY : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches.length === 1 ? event.touches[0]! : null;
      if (finger === null || !touch) return;
      const delta = finger - touch.clientY;
      finger = touch.clientY;
      if (event.cancelable && holds(delta)) event.preventDefault();
    };

    let attached = false;
    const attach = (on: boolean) => {
      if (on === attached) return;
      attached = on;
      if (on) {
        addEventListener("wheel", onWheel, { passive: false });
        addEventListener("keydown", onKey);
        addEventListener("touchstart", onTouchStart, { passive: true });
        addEventListener("touchmove", onTouchMove, { passive: false });
      } else {
        removeEventListener("wheel", onWheel);
        removeEventListener("keydown", onKey);
        removeEventListener("touchstart", onTouchStart);
        removeEventListener("touchmove", onTouchMove);
      }
    };
    // Listen only near the exit, and only while a hold could still come.
    update.current = () => {
      const at = exit();
      const capped = heldAt.current !== null && performance.now() - heldAt.current >= cap.current;
      const shown = step.current === STEP.cell && !opening.current;
      attach(at !== null && !capped && !shown && scrollY > at - NEAR_SCREENS * innerHeight && scrollY <= at + 1);
    };
    // The panel has opened once its clip has run.
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "clip-path" || !(event.target instanceof Element) || !event.target.matches("[data-panel]")) return;
      if (step.current !== STEP.cell || !opening.current) return;
      opening.current = false;
      update.current();
    };
    const onScroll = () => update.current();
    const section = scroller.current;
    section?.addEventListener("transitionend", onTransitionEnd);
    addEventListener("scroll", onScroll, { passive: true });
    update.current();
    return () => {
      attach(false);
      update.current = () => {};
      section?.removeEventListener("transitionend", onTransitionEnd);
      removeEventListener("scroll", onScroll);
    };
  }, [reduced, scroller, sticky]);

  useEffect(() => {
    step.current = change.step;
    // Going back up starts afresh: the next way down may be held again.
    if (change.step < change.previous) heldAt.current = null;
    opening.current = cellOpensLate(change.step, change.previous);
    update.current();
    if (!opening.current) return;
    // Should the panel's transition never report its end, the cell counts as open a little after it would have.
    const timer = window.setTimeout(() => {
      opening.current = false;
      update.current();
    }, cap.current + OPEN_SLACK);
    return () => clearTimeout(timer);
  }, [change]);
}
