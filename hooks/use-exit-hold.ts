"use client";

import { useEffect, useRef, type RefObject } from "react";
import { isGliding } from "@/hooks/glide-signal";
import type { StepChange } from "@/hooks/use-scroll-step";
import { cssMs } from "@/lib/hero-picture";
import { STEP, TIMING, cellArrival, cellOpensLate, exitScroll, holdCap, holdsExit, keyScroll, shouldLock, wheelPixels } from "@/lib/walkthrough";

/** Elements that take a scrolling key for themselves, so a key pressed in one is left alone. */
const OWN_KEYS =
  "input, textarea, select, button, summary, [contenteditable]:not([contenteditable='false']), [role=tab], [role=menuitem], [role=option], [role=slider]";
/** The hold listens only while the page is within this many screens above the exit, so the rest of the page scrolls freely. */
const NEAR_SCREENS = 3;
/** The attribute on the root that locks the page's scroll while the hold has it (see app/globals.css). */
const LOCKED = "data-scroll-held";

/**
 * A short hold at the end of the walkthrough, so however the reader arrives
 * there the last step plays: its cell lights and its panel opens, and only
 * then does the page go on. A wheel, a touch or a scrolling key that would
 * carry the page out of the pinned section is stopped before the page moves
 * (see `holdsExit`), and a wheel, a fling or a trackpad's momentum the browser
 * will not let be stopped is met by locking the page's scroll at the exit
 * (see `shouldLock`). Held while the walkthrough is still on its way, it is
 * jumped to the last step at once (`toEnd`), skipping the steps between. The
 * hold lets go once the panel has opened, or at the cap (see `holdCap`) from
 * when the last step showed, and a timer of its own ends each hold and each
 * lock, so nothing keeps the page stuck. The page is never pulled back: a
 * move that would cross the exit brings it there and no further, and a page
 * already past it is left alone. Scrolling up unlocks it at once; an in-page
 * glide and reduced motion are never held. The listeners are there only near
 * the exit while a hold could come.
 *
 * `scroller` is the tall section and `sticky` the frame pinned inside it.
 */
export function useExitHold(
  scroller: RefObject<HTMLElement | null>,
  sticky: RefObject<HTMLElement | null>,
  change: StepChange,
  reduced: boolean,
  toEnd: RefObject<() => void>,
) {
  const step = useRef(change.step);
  // On the last step, reached from above, until its panel has opened.
  const opening = useRef(false);
  // When the running hold first stopped a move, or null. It ends the hold at the cap should nothing else.
  const heldAt = useRef<number | null>(null);
  const update = useRef(() => {});
  const cap = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const token = (name: string) => cssMs(getComputedStyle(document.documentElement).getPropertyValue(name));
    cap.current = holdCap(
      cellArrival({
        cellBeat: TIMING.cellBeat,
        panelDelay: token("--duration-panel-delay"),
        panelOpen: token("--duration-leave"),
      }),
    );

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
    let capTimer = 0;
    const sinceHeld = () => (heldAt.current === null ? null : performance.now() - heldAt.current);
    const startHold = () => {
      // Held on the way, the walkthrough goes straight to the last step, so its cell plays now.
      if (step.current < STEP.cell) toEnd.current();
      if (heldAt.current !== null) return;
      heldAt.current = performance.now();
      // The hold's hard end: the page is free once it has lasted its cap, whatever else happens.
      clearTimeout(capTimer);
      capTimer = window.setTimeout(() => update.current(), cap.current);
    };
    const holds = (delta: number) => {
      const at = exit();
      if (at === null || isGliding()) return false;
      const held = holdsExit({ step: step.current, opening: opening.current, sinceHeld: sinceHeld(), cap: cap.current, delta, y: scrollY, exit: at });
      if (held) startHold();
      return held;
    };

    // The lock on the page's scroll, for a move that cannot be stopped. A timer of its own always ends it.
    let locked = false;
    let lockTimer = 0;
    let settling = 0;
    const unlock = () => {
      clearTimeout(lockTimer);
      cancelAnimationFrame(settling);
      if (!locked) return;
      locked = false;
      document.documentElement.removeAttribute(LOCKED);
    };
    // A frame of the scroll may already be under way as the lock comes, so the page is left to come to rest
    // first; short of the exit, it is then brought to it, never past it and never back.
    const settle = () => {
      cancelAnimationFrame(settling);
      settling = requestAnimationFrame(() => {
        settling = requestAnimationFrame(() => {
          const at = exit();
          if (locked && at !== null && scrollY < at) scrollTo({ top: at, behavior: "instant" });
        });
      });
    };
    const lock = () => {
      startHold();
      locked = true;
      document.documentElement.setAttribute(LOCKED, "");
      clearTimeout(lockTimer);
      lockTimer = window.setTimeout(() => {
        unlock();
        update.current();
      }, cap.current);
      settle();
    };
    const pending = () => step.current < STEP.cell || opening.current;
    let lastY = scrollY;
    let lastAt = performance.now();
    const watchScroll = () => {
      const delta = scrollY - lastY;
      const gap = performance.now() - lastAt;
      lastY = scrollY;
      lastAt = performance.now();
      const at = exit();
      if (locked) {
        // Moved back up by something else, or gliding, the page is free; still coming to rest, it is left to.
        if (at === null || isGliding() || delta < 0) unlock();
        else settle();
        return;
      }
      if (at === null || isGliding()) return;
      if (shouldLock({ y: scrollY, exit: at, lastDelta: delta, lastGap: gap, pending: pending(), sinceHeld: sinceHeld(), cap: cap.current })) lock();
    };
    // Held short of the exit, the page is brought to it, never past it and never back.
    const stopAtExit = (event: Event) => {
      event.preventDefault();
      const at = exit();
      if (at !== null && scrollY < at) scrollTo({ top: at, behavior: "instant" });
    };

    // A move up unlocks the page. The browser has already found nothing to scroll for this one, so it is scrolled here.
    const goUp = (event: Event, delta: number) => {
      if (!locked) return;
      unlock();
      if (!event.cancelable) return;
      event.preventDefault();
      scrollBy({ top: delta, behavior: "instant" });
    };
    const onWheel = (event: WheelEvent) => {
      // A pinch zooms the page (a wheel with ctrl held).
      if (event.ctrlKey) return;
      const delta = wheelPixels(event.deltaY, event.deltaMode, innerHeight);
      if (delta < 0) goUp(event, delta);
      // A move the browser will not let be stopped is left to the lock.
      if (event.cancelable && holds(delta)) stopAtExit(event);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest(OWN_KEYS)) return;
      const delta = keyScroll(event.key, event.shiftKey, innerHeight);
      if (delta < 0) unlock();
      if (holds(delta)) stopAtExit(event);
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
      if (delta < 0) unlock();
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
      const since = sinceHeld();
      const capped = since !== null && since >= cap.current;
      if (capped || !pending()) unlock();
      attach(locked || (at !== null && !capped && pending() && scrollY > at - NEAR_SCREENS * innerHeight && scrollY <= at + 1));
    };
    // The panel has opened once its clip has run.
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "clip-path" || !(event.target instanceof Element) || !event.target.matches("[data-panel]")) return;
      if (step.current !== STEP.cell || !opening.current) return;
      opening.current = false;
      update.current();
    };
    const onScroll = () => {
      watchScroll();
      update.current();
    };
    const section = scroller.current;
    section?.addEventListener("transitionend", onTransitionEnd);
    addEventListener("scroll", onScroll, { passive: true });
    update.current();
    return () => {
      clearTimeout(capTimer);
      unlock();
      attach(false);
      update.current = () => {};
      section?.removeEventListener("transitionend", onTransitionEnd);
      removeEventListener("scroll", onScroll);
    };
  }, [reduced, scroller, sticky, toEnd]);

  useEffect(() => {
    step.current = change.step;
    // Going back up starts afresh: the next way down may be held again.
    if (change.step < change.previous) heldAt.current = null;
    opening.current = cellOpensLate(change.step, change.previous);
    update.current();
    if (!opening.current) return;
    // Should the panel's transition never report its end, the cell counts as open at the cap.
    const timer = window.setTimeout(() => {
      opening.current = false;
      update.current();
    }, cap.current);
    return () => clearTimeout(timer);
  }, [change]);
}
