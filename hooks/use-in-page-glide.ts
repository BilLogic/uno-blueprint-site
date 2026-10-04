"use client";

import { useEffect } from "react";
import { easeInOut, glideDuration, glideEnd, glideJumps, inPageTarget, onGlidePath, setGliding } from "@/lib/glide";

/** A pinned section (the walkthrough's tall scroller), and the frame pinned inside it. */
const PIN = "[data-pin]";
const PIN_FRAME = "[data-pin-frame]";

/** Ends the glide that is running, if one is. */
let finishRunning: (() => void) | null = null;

/**
 * Glides to `target`. A pinned section on the way is held to its frame's
 * height for the trip; on arrival it is pinned again and the view is held
 * exactly where it landed. A wheel or a touch stops the glide where it is.
 * With less motion, it jumps.
 */
function glide(target: HTMLElement) {
  finishRunning?.();
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    pin.style.height = `${frame ? frame.offsetHeight : innerHeight}px`;
    return [pin, height] as const;
  });

  const to = glideEnd(aim(), root.scrollHeight - innerHeight);
  const distance = to - from;

  // Pin again without the target moving on screen: scroll by however far the restored height pushed it.
  const restore = () => {
    if (!held.length) return;
    const before = target.getBoundingClientRect().top;
    root.style.overflowAnchor = "none";
    for (const [pin, height] of held) pin.style.height = height;
    held = [];
    scrollTo({ top: scrollY + target.getBoundingClientRect().top - before, behavior: "instant" });
    root.style.overflowAnchor = "";
  };

  if (glideJumps(distance, reduced)) {
    scrollTo({ top: to, behavior: "instant" });
    restore();
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
  const finish = () => {
    cancelAnimationFrame(frame);
    removeEventListener("wheel", stop);
    removeEventListener("touchstart", stop);
    restore();
    setGliding(false);
    finishRunning = null;
    // Whatever skipped the scroll during the glide reads it now.
    dispatchEvent(new Event("scroll"));
  };
  const step = (now: number) => {
    if (stopped) return finish();
    if (!start) start = now;
    const p = Math.min(1, (now - start) / ms);
    scrollTo({ top: from + distance * easeInOut(p), behavior: "instant" });
    if (p < 1) frame = requestAnimationFrame(step);
    else finish();
  };

  setGliding(true);
  finishRunning = finish;
  addEventListener("wheel", stop, { passive: true });
  addEventListener("touchstart", stop, { passive: true });
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
