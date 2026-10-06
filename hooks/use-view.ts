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

/** A view's page: `main#human` or `main#agent`. */
const pageOf = (view: View) => document.getElementById(view);

/** Puts `view` on the page in place of the other. */
function show(view: View) {
  document.documentElement.setAttribute("data-view", view);
  // The other view starts at its top, not at the scroll position of this one.
  window.scrollTo(0, 0);
}

/**
 * One half of a switch, drawn on the page: the view on the page leaving, or
 * arriving. Its animation is held still and moved on a frame at a time, so it
 * keeps the page's own clock.
 */
type Phase = {
  kind: "leave" | "arrive";
  animation: Animation;
  start: number;
  duration: number;
};

let phase: Phase | null = null;
let frame = 0;

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** How the view looks fully gone as it leaves, and just before it arrives (styles/tokens.css). */
const sunk = (): Keyframe => ({
  opacity: 0,
  transform: `translateY(${token("--spacing-view-sink")})`,
  filter: `blur(${token("--blur-view-leave")})`,
});
const risen = (): Keyframe => ({
  opacity: 0,
  transform: `translateY(${token("--spacing-view-rise")})`,
  filter: `blur(${token("--blur-view-arrive")})`,
});
const atRest: Keyframe = { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" };

/** How `page` looks this moment, part way through a switch or at rest. */
function lookOf(page: HTMLElement): Keyframe {
  const { opacity, transform, filter } = getComputedStyle(page);
  return { opacity, transform, filter };
}

/** Ends the half of a switch that is drawing, leaving its view as it looks at rest. */
function stop() {
  cancelAnimationFrame(frame);
  phase?.animation.cancel();
  phase = null;
  document.removeEventListener("visibilitychange", onHidden);
}

/** The switch goes straight to its end: the view picked, on the page, at rest. */
function settle() {
  stop();
  if (picked && picked !== shownView()) show(picked);
}

// A hidden tab draws no frames, so the switch ends at once rather than hang half way.
function onHidden() {
  if (document.visibilityState === "hidden") settle();
}

function play(kind: Phase["kind"], page: HTMLElement, keyframes: Keyframe[], start: number) {
  stop();
  const leaving = kind === "leave";
  const duration = cssMs(token(leaving ? "--duration-view-leave" : "--duration-view-arrive"));
  const easing = token(leaving ? "--ease-view-leave" : "--ease-view-arrive");
  const animation = page.animate(keyframes, { duration, easing, fill: "both" });
  animation.pause();
  animation.currentTime = Math.max(0, performance.now() - start);
  phase = { kind, animation, start, duration };
  document.addEventListener("visibilitychange", onHidden);
  frame = requestAnimationFrame(step);
}

function step() {
  if (!phase) return;
  const elapsed = Math.max(0, performance.now() - phase.start);
  phase.animation.currentTime = Math.min(elapsed, phase.duration);
  if (elapsed < phase.duration) {
    frame = requestAnimationFrame(step);
    return;
  }
  if (phase.kind === "arrive") return stop();
  // Gone: the view picked takes its place and rises in. Laying out the human
  // page can hold up a frame; the rise starts after that, so none of it is lost.
  stop();
  if (picked && picked !== shownView()) show(picked);
  const page = pageOf(shownView());
  if (page) play("arrive", page, [risen(), atRest], performance.now());
}

/**
 * Switches to `next`. The view on the page sinks into a blur and fades, then
 * `next` rises out of one. Picked again mid-way, the switch turns from where it
 * is: the view still on the page rises back, or the one arriving leaves again.
 */
function setView(next: View) {
  if (next === getView()) return;
  picked = next;
  for (const listener of listeners) listener();

  const page = pageOf(shownView());
  if (!page || matchMedia(REDUCED_MOTION_QUERY).matches || document.visibilityState === "hidden") return settle();
  if (next === shownView()) play("arrive", page, [lookOf(page), atRest], performance.now());
  // A view already leaving carries on; the pick is read once it has gone.
  else if (phase?.kind !== "leave") play("leave", page, [lookOf(page), sunk()], performance.now());
}

export function useView(): { view: View; setView: (view: View) => void } {
  const view = useSyncExternalStore(subscribe, getView, () => "human" as const);
  return { view, setView };
}
