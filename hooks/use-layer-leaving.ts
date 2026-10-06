"use client";

import { useEffectEvent, useLayoutEffect, type RefObject } from "react";
import { leaveRecording } from "@/components/showcase/stage-motion";

/**
 * The layer of the tab just left, on a showcase's stage: the demo stages'
 * recordings and the harness pictures alike. Already stopped, it sinks away
 * from wherever its own arrival had got to, and `onLeft` follows once that is
 * over: run to its end, or cut short (the stage finishes it at once for a
 * reader who asks for less motion mid-change).
 */
export function useLayerLeaving(layer: RefObject<HTMLElement | null>, leaving: boolean, onLeft: (() => void) | undefined) {
  const gone = useEffectEvent(() => onLeft?.());
  useLayoutEffect(() => {
    if (!leaving || !layer.current) return;
    leaveRecording(layer.current).finished.then(gone, gone);
  }, [leaving, layer]);
}
