"use client";

import { useEffect } from "react";
import { setGliding } from "@/hooks/glide-signal";
import { REDUCED_MOTION_QUERY } from "@/hooks/use-media-query";
import { easeInOut, glideDuration, glideEnd, glideJumps, inPageTarget, keyStopsGlide, onGlidePath } from "@/lib/glide";

/** A pinned section (the walkthrough's tall scroller), and the frame pinned inside it. */
const PIN = "[data-pin]";
const PIN_FRAME = "[data-pin-frame]";
/** Elements that take focus without a tabindex. */
const FOCUSABLE = "a[href], button, input, select, textarea, summary, [tabindex]";

/** Ends the glide that is running, if one is. */
let finishRunning: (() => void) | null = null;

/** Moves focus to where the reader arrived, so the next Tab starts there; the view stays put. */
function focusArrival(target: HTMLElement) {
  if (!target.matches(FOCUSABLE)) {
    target.tabIndex = -1;
    // Focus that arrives by a link is not drawn round the whole section.
    target.dataset.glideTarget = "";
  }
  target.focus({ preventScroll: true });
}

/**
 * Glides to `target`. A pinned section on the way is held to its frame's
 * height for the trip; on arrival it is pinned again, the view is held exactly
 * where it landed, and focus moves to the target. A wheel, a touch, a press or
 * a scrolling key stops the glide where it is. With less motion, it jumps.
 */
function glide(target: HTMLElement) {
  finishRunning?.();
  const root = document.documentElement;
  const reduced = matchMedia(REDUCED_MOTION_QUERY).matches;
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const from = scrollY;
  const aim = () => scrollY + target.getBoundingClientRect().top - margin;

  const pins = [...document.querySelectorAll<HTMLElement>(PIN)].filter((pin) => {
    const rect = pin.getBoundingClientRect();
    const top = rect.top + scrollY;
    return onGlidePath({ top, bottom: top + rect.height }, from, aim(), innerHeight);
  });
  let held = pins.map((pin) => {
    const height = pin.style.height;
    const frame = pin.querySelector<HTMLElement>(PIN_FRAME);
    const hold = `${frame ? frame.offsetHeight : innerHeight}px`;
    pin.style.height = hold;
    return { pin, height, hold };
  });

  const to = glideEnd(aim(), root.scrollHeight - innerHeight);
  const distance = to - from;

  // Pin again without the target moving on screen: scroll by however far the restored height pushed it.
  const restore = () => {
    if (!held.length) return;
    const before = target.getBoundingClientRect().top;
    root.style.overflowAnchor = "none";
    // A section that refitted itself during the trip wrote a newer height than the one saved; keep that.
    for (const { pin, height, hold } of held) if (pin.style.height === hold) pin.style.height = height;
    held = [];
    scrollTo({ top: scrollY + target.getBoundingClientRect().top - before, behavior: "instant" });
    root.style.overflowAnchor = "";
  };

  if (glideJumps(distance, reduced)) {
    scrollTo({ top: to, behavior: "instant" });
    restore();
    focusArrival(target);
    dispatchEvent(new Event("scroll"));
    return;
  }

  const ms = glideDuration(distance, innerHeight);
  let start = 0;
  let frame = 0;
  let stopped = false;
  const stop = () => {
    stopped = true;
  };
  const stopOnKey = (event: KeyboardEvent) => {
    if (keyStopsGlide(event.key)) stop();
  };
  const finish = (arrived: boolean) => {
    cancelAnimationFrame(frame);
    removeEventListener("wheel", stop);
    removeEventListener("touchstart", stop);
    removeEventListener("pointerdown", stop);
    removeEventListener("keydown", stopOnKey);
    document.removeEventListener("visibilitychange", onHidden);
    if (arrived) scrollTo({ top: to, behavior: "instant" });
    restore();
    if (arrived) focusArrival(target);
    setGliding(false);
    finishRunning = null;
    // Whatever skipped the scroll during the glide reads it now.
    dispatchEvent(new Event("scroll"));
  };
  // A hidden tab draws no frames, so the glide arrives at once rather than hang mid-trip.
  const onHidden = () => {
    if (document.visibilityState === "hidden") finish(true);
  };
  const step = (now: number) => {
    if (stopped) return finish(false);
    if (!start) start = now;
    const p = Math.min(1, (now - start) / ms);
    scrollTo({ top: from + distance * easeInOut(p), behavior: "instant" });
    if (p < 1) frame = requestAnimationFrame(step);
    else finish(true);
  };

  setGliding(true);
  finishRunning = () => finish(false);
  addEventListener("wheel", stop, { passive: true });
  addEventListener("touchstart", stop, { passive: true });
  addEventListener("pointerdown", stop, { passive: true });
  addEventListener("keydown", stopOnKey);
  document.addEventListener("visibilitychange", onHidden);
  frame = requestAnimationFrame(step);
}

/** Links within the page glide to their section instead of jumping. */
export function useInPageGlide() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // A modified click (a new tab, a download) is the browser's to handle.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      const id = inPageTarget(link?.getAttribute("href") ?? null);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      glide(target);
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      finishRunning?.();
    };
  }, []);
}
