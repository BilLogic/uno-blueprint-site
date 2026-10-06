"use client";

import { useSyncExternalStore } from "react";
import { REDUCED_MOTION_QUERY } from "@/hooks/use-media-query";
import { cssMs } from "@/lib/css-time";
import type { View } from "@/lib/view";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The view on the page: the one `data-view` names. */
const shownView = (): View =>
  document.documentElement.getAttribute("data-view") === "agent" ? "agent" : "human";

/** The view last picked. While a switch is under way it is not yet the one on the page. */
let picked: View | null = null;

const getView = (): View => picked ?? shownView();

/** A view's main element: `main#human` or `main#agent`. */
const viewMain = (view: View) => document.getElementById(view);

/**
 * A switch has two phases: the view on the page leaves, sinking into a blur
 * as it fades, then the view picked arrives, rising out of one. Each phase's
 * values are tokens in styles/tokens.css.
 */
type Phase = "leave" | "arrive";

const PHASES: Record<Phase, { duration: string; easing: string; drop: string; blur: string }> = {
  leave: {
    duration: "--duration-view-leave",
    easing: "--ease-view-leave",
    drop: "--spacing-view-sink",
    blur: "--blur-view-leave",
  },
  arrive: {
    duration: "--duration-view-arrive",
    easing: "--ease-view-arrive",
    drop: "--spacing-view-rise",
    blur: "--blur-view-arrive",
  },
};

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** How a view looks out of sight at a phase's far end: sunk once it has left, low before it arrives. */
function outOfSight(phase: Phase): Keyframe {
  const { drop, blur } = PHASES[phase];
  return { opacity: 0, transform: `translateY(${token(drop)})`, filter: `blur(${token(blur)})` };
}

const atRest: Keyframe = { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" };

/** How `main` looks this moment, part way through a phase or at rest. */
function poseOf(main: HTMLElement): Keyframe {
  const { opacity, transform, filter } = getComputedStyle(main);
  return { opacity, transform, filter };
}

/** The phase under way, if a switch is. */
let running: Animation | null = null;

/**
 * One list for the reduced-motion query, so its listener comes off the list it
 * went on. It is made on first use, since the server has no window.
 */
let reducedMotion: MediaQueryList | null = null;
const reducedMotionList = () => (reducedMotion ??= matchMedia(REDUCED_MOTION_QUERY));

/** Stops the phase under way, leaving the view on the page as it is at rest. The view is not swapped. */
function cancelMotion() {
  running?.cancel();
  running = null;
  document.removeEventListener("visibilitychange", onHidden);
  reducedMotionList().removeEventListener("change", onReducedMotion);
}

/** Ends the switch at once: the view picked is on the page, at rest. */
function swapNow() {
  cancelMotion();
  if (picked && picked !== shownView()) {
    document.documentElement.setAttribute("data-view", picked);
    // The other view starts at its top, not at the scroll position of this one. Scrolled at the swap,
    // not on the pick, so the page does not jump under the view leaving.
    window.scrollTo(0, 0);
  }
}

// A hidden tab may hold its animations, so the switch ends at once rather than hang half way.
function onHidden() {
  if (document.visibilityState === "hidden") swapNow();
}

// A reader who asks for less motion mid-switch gets its end at once.
function onReducedMotion(event: MediaQueryListEvent) {
  if (event.matches) swapNow();
}

/** Runs `phase` on `main` from `from` to `to`, then calls `then`, unless a later pick has stopped it first. */
function play(phase: Phase, main: HTMLElement, from: Keyframe, to: Keyframe, then: () => void) {
  cancelMotion();
  const { duration, easing } = PHASES[phase];
  // Held at its end until `then` runs, so the view leaving does not flash back whole before the swap.
  const animation = main.animate([from, to], { duration: cssMs(token(duration)), easing: token(easing), fill: "forwards" });
  running = animation;
  document.addEventListener("visibilitychange", onHidden);
  reducedMotionList().addEventListener("change", onReducedMotion);
  animation.finished.then(
    () => {
      if (running === animation) then();
    },
    // Cancelled by a later pick, which has taken over.
    () => {},
  );
}

/** The view picked takes the page and rises in. */
function arrive() {
  swapNow();
  const main = viewMain(shownView());
  if (main) play("arrive", main, outOfSight("arrive"), atRest, cancelMotion);
}

/**
 * Switches to `next`. The view on the page sinks into a blur and fades, then
 * `next` rises out of one. A pick mid-way turns the switch from where it is:
 * the view still leaving rises back, or the one arriving leaves again.
 */
function setView(next: View) {
  if (next === getView()) return;
  picked = next;
  for (const listener of listeners) listener();

  const main = viewMain(shownView());
  if (!main || reducedMotionList().matches || document.visibilityState === "hidden") return swapNow();
  if (next === shownView()) play("arrive", main, poseOf(main), atRest, cancelMotion);
  else play("leave", main, poseOf(main), outOfSight("leave"), arrive);
}

export function useView(): { view: View; setView: (view: View) => void } {
  const view = useSyncExternalStore(subscribe, getView, () => "human" as const);
  return { view, setView };
}
