"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { enterStage, entrySettles } from "@/components/showcase/stage-motion";
import { useInView } from "./use-in-view";

/** Whether any of `element` is on screen. */
const onScreenNow = (element: Element) => {
  const { top, bottom } = element.getBoundingClientRect();
  return bottom > 0 && top < innerHeight;
};

type StageEntry = {
  /** Pass the stage to this as it mounts. */
  watch: (node: HTMLElement | null) => void;
  /** The stage's `data-entry`: unset until the page is live, then `waiting` until the entry runs, then `in`. */
  entry: "waiting" | "in" | undefined;
  /** The stage stands unseen at the entry's first frame, still to come into view. */
  waiting: boolean;
  /** The entry has brought what is inside the stage into place, so it may start to play. */
  settled: boolean;
};

/**
 * A stage's entry, as the demo stages and the harness showcase share it. The
 * first time the stage is well into view it enters in two beats: its frame
 * rises out of a blur, then what is showing inside it, the layer that
 * `layer` (a selector) finds. A stage already in sight as the page goes live
 * is simply there, and so is any stage for a reader who asked for less
 * motion; whatever is moving on the stage comes to rest at once if they ask
 * mid-change. The stage waits at the entry's first frame by the `stage` class
 * in Showcase.module.css, which reads `data-entry`.
 */
export function useStageEntry(layer: string, reducedMotion: boolean): StageEntry {
  // Whether the stage was on screen as the page went live, or null before then (in the server's HTML, and
  // while hydrating). A stage already in sight is simply there; only one still to come waits for its entry.
  const [inSightAtLoad, setInSightAtLoad] = useState<boolean | null>(null);
  // The entry waits until the stage is well into view, so it is seen.
  const [watchEntry, entered] = useInView<HTMLElement>({ threshold: 0.25, once: true });
  const [settled, setSettled] = useState(false);
  const stage = useRef<HTMLElement | null>(null);
  const watch = useCallback(
    (node: HTMLElement | null) => {
      stage.current = node;
      if (node) setInSightAtLoad((was) => was ?? onScreenNow(node));
      watchEntry(node);
    },
    [watchEntry],
  );

  // Once the page is live, a stage then off screen waits for its entry, unless the reader asked for less motion.
  const waiting = inSightAtLoad === false && !entered && !reducedMotion;
  // The entry, as the waiting ends: the frame, then the layer showing inside it.
  const wasWaiting = useRef(false);
  useLayoutEffect(() => {
    if (waiting) {
      wasWaiting.current = true;
      return;
    }
    if (!wasWaiting.current) return;
    wasWaiting.current = false;
    const node = stage.current;
    if (node && !reducedMotion) enterStage(node, node.querySelector<HTMLElement>(layer));
  }, [waiting, reducedMotion, layer]);

  // Asked for less motion mid-change, whatever is moving on the stage comes to rest at once; a layer
  // leaving goes with it.
  useLayoutEffect(() => {
    if (!reducedMotion) return;
    for (const animation of stage.current?.getAnimations({ subtree: true }) ?? []) animation.finish();
  }, [reducedMotion]);

  // What is inside plays once the entry has brought it into place. With less motion, or a stage in sight
  // from the start, there is no entry to wait for.
  const noEntry = reducedMotion || inSightAtLoad === true;
  useEffect(() => {
    if (settled || !(entered || noEntry)) return;
    const timer = window.setTimeout(() => setSettled(true), noEntry ? 0 : entrySettles());
    return () => clearTimeout(timer);
  }, [entered, settled, noEntry]);

  return { watch, entry: inSightAtLoad === null ? undefined : waiting ? "waiting" : "in", waiting, settled };
}
