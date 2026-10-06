"use client";

import { useEffectEvent, useLayoutEffect, type RefObject } from "react";
import { arriveRecording, leaveRecording } from "@/components/showcase/stage-motion";

/**
 * A layer on a stage through a tab change, as the demo stages' recordings
 * and the harness pictures share it. The layer of a tab just picked rises in
 * out of a blur as it first shows; it is never arriving again once it is not.
 * The layer of the tab just left sinks away from wherever its own arrival had
 * got to, and `onLeft` follows once that is over: run to its end, or cut
 * short (the stage finishes it at once for a reader who asks for less motion
 * mid-change).
 */
export function useLayerMotion(
  layer: RefObject<HTMLElement | null>,
  { arriving, leaving, onLeft }: { arriving: boolean; leaving: boolean; onLeft?: (() => void) | undefined },
) {
  useLayoutEffect(() => {
    if (arriving && layer.current) arriveRecording(layer.current);
  }, [arriving, layer]);

  const left = useEffectEvent(() => onLeft?.());
  useLayoutEffect(() => {
    if (!leaving || !layer.current) return;
    leaveRecording(layer.current).finished.then(left, left);
  }, [leaving, layer]);
}
