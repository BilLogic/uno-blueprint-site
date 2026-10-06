"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { arriveLayer, enterStage } from "@/components/ui/stage-motion";
import { useInView } from "./use-in-view";

/** Whether any of `element` is on screen. */
const onScreenNow = (element: Element) => {
  const { top, bottom } = element.getBoundingClientRect();
  return bottom > 0 && top < innerHeight;
};

type StageMotion = {
  /** Pass the stage to this as it mounts. */
  watch: (node: HTMLElement | null) => void;
  /** The stage's `data-entry`: unset until the page is live, then `waiting` until the entry runs, then `in`. */
  entry: "waiting" | "in" | undefined;
  /** The stage stands unseen at the entry's first frame, still to come into view. */
  waiting: boolean;
  /** What is showing on the stage is in place, so it may play: the entry has run, or there was none. */
  inPlace: boolean;
};

/**
 * A tabbed stage's motion, as the demo stages and the harness showcase share
 * it. `layer` is a selector for the layer showing on the stage, and `shown`
 * names the tab it shows; it is new at every tab picked.
 *
 * The first time the stage is well into view it enters in two beats: its
 * frame rises out of a blur, then the layer showing inside it. A stage
 * already in sight as the page goes live is simply there. The stage waits at
 * the entry's first frame by the `stage` class in Stage.module.css, which
 * reads `data-entry`.
 *
 * The layer of a tab just picked rises in as it first shows: once for each
 * pick, so turning the reader's motion setting off and on again never
 * replays it. (The layer just left sinks away by `useLayerLeaving`.)
 *
 * A reader who asked for less motion sees the stage already in place, and
 * tabs that change at once; asked mid-change, whatever is moving on the
 * stage comes to rest at once.
 */
export function useStageMotion(layer: string, shown: unknown, reducedMotion: boolean): StageMotion {
  // Whether the stage was on screen as the page went live, or null before then (in the server's HTML, and
  // while hydrating). A stage already in sight is simply there; only one still to come waits for its entry.
  const [inSightAtLoad, setInSightAtLoad] = useState<boolean | null>(null);
  // The entry waits until the stage is well into view, so it is seen.
  const [watchEntry, entered] = useInView<HTMLElement>({ threshold: 0.25, once: true });
  // The entry has run, or been cut short: what is showing is in place.
  const [entryDone, setEntryDone] = useState(false);
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
    if (!node || reducedMotion) return;
    void enterStage(node, node.querySelector<HTMLElement>(layer)).then(() => setEntryDone(true));
  }, [waiting, reducedMotion, layer]);

  // The layer of a tab just picked rises in, once for each pick.
  const arrivedFor = useRef(shown);
  useLayoutEffect(() => {
    if (arrivedFor.current === shown) return;
    arrivedFor.current = shown;
    const showing = stage.current?.querySelector<HTMLElement>(layer);
    if (showing && !reducedMotion) arriveLayer(showing);
  }, [shown, reducedMotion, layer]);

  // Asked for less motion mid-change, whatever is moving on the stage comes to rest at once; a layer
  // leaving goes with it.
  useLayoutEffect(() => {
    if (!reducedMotion) return;
    for (const animation of stage.current?.getAnimations({ subtree: true }) ?? []) animation.finish();
  }, [reducedMotion]);

  return {
    watch,
    entry: inSightAtLoad === null ? undefined : waiting ? "waiting" : "in",
    waiting,
    // With less motion, or a stage in sight from the start, there is no entry to wait for.
    inPlace: entryDone || reducedMotion || inSightAtLoad === true,
  };
}
