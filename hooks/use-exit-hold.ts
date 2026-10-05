"use client";

import { useEffect, type RefObject } from "react";
import { isGliding } from "@/hooks/glide-signal";
import type { StepChange } from "@/hooks/use-scroll-step";
import { CELL_ARRIVAL, cellOpensLate, holdsExit, keyScroll, wheelPixels } from "@/lib/walkthrough";

/** Elements that take a scrolling key for themselves, so a key pressed in one is left alone. */
const OWN_KEYS =
  "input, textarea, select, button, summary, [contenteditable]:not([contenteditable='false']), [role=tab], [role=menuitem], [role=option], [role=slider]";

/**
 * A short hold at the end of the walkthrough. Arriving at the cell from above,
 * it lights and then opens (`CELL_ARRIVAL`); until it has, a wheel, a touch
 * or a scrolling key that would carry the page out of the pinned section is
 * stopped before the page moves (see `holdsExit`). The page is never pulled
 * back: a wheel or key that would cross the exit brings it there and no
 * further. When the hold ends the next move goes on as usual; scrolling up,
 * a page already past the section, an in-page glide and reduced motion are
 * never held. The listeners are only there for the hold, and a timer takes
 * them away when it ends, so nothing can keep the page stuck.
 *
 * `scroller` is the tall section and `sticky` the frame pinned inside it.
 */
export function useExitHold(
  scroller: RefObject<HTMLElement | null>,
  sticky: RefObject<HTMLElement | null>,
  change: StepChange,
  reduced: boolean,
) {
  useEffect(() => {
    if (reduced || !cellOpensLate(change.step, change.previous)) return;
    const arrived = performance.now();

    // The scroll position where the walkthrough lets go of its frame, or `null` while it is not pinned.
    const exit = (): number | null => {
      const section = scroller.current;
      const pinned = sticky.current;
      if (!section || !pinned) return null;
      const rect = section.getBoundingClientRect();
      if (rect.height <= pinned.offsetHeight) return null;
      const stickyTop = parseFloat(getComputedStyle(pinned).top) || 0;
      return rect.bottom + scrollY - stickyTop - pinned.offsetHeight;
    };
    const holds = (delta: number) => {
      const at = exit();
      if (at === null || isGliding()) return false;
      return holdsExit({ step: change.step, since: performance.now() - arrived, delta, y: scrollY, exit: at });
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

    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("keydown", onKey);
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchmove", onTouchMove, { passive: false });
    const detach = () => {
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchmove", onTouchMove);
    };
    // The hold's hard end: whatever the clock or the events say, the page is free once the cell has had its time.
    const timer = window.setTimeout(detach, CELL_ARRIVAL);
    return () => {
      clearTimeout(timer);
      detach();
    };
  }, [scroller, sticky, change, reduced]);
}
