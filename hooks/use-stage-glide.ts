"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { cssMs, rootToken } from "@/lib/css-time";

/**
 * Glides a showcase's stage to its new height as its tab changes; on a phone
 * the tabs' stages differ in height. Call the returned function as the tab is
 * picked, before the new tab renders; `shown` names the tab now showing. The
 * height is measured either side and animated in px, so it needs no browser
 * to interpolate `aspect-ratio`. A tab picked mid-glide glides on from the
 * height the stage had got to. A reader who asked for less motion gets the
 * new height at once.
 */
export function useStageGlide(shown: unknown, stage: RefObject<HTMLElement | null>, reducedMotion: boolean): () => void {
  // The stage's height as the tab was picked, for the glide to start from.
  const from = useRef<number | null>(null);
  const glide = useRef<Animation | null>(null);
  const last = useRef(shown);

  useLayoutEffect(() => {
    if (last.current === shown) return;
    last.current = shown;
    const node = stage.current;
    const start = from.current;
    from.current = null;
    glide.current?.cancel();
    glide.current = null;
    if (!node || start === null || reducedMotion) return;
    const { width, height: end } = node.getBoundingClientRect();
    if (Math.abs(start - end) < 1) return;
    // The width is held, or the stage's aspect ratio would take it from the height.
    glide.current = node.animate(
      [
        { width: `${width}px`, height: `${start}px` },
        { width: `${width}px`, height: `${end}px` },
      ],
      { duration: cssMs(rootToken("--duration-stage-glide")), easing: rootToken("--ease-out") },
    );
  }, [shown, stage, reducedMotion]);

  return () => {
    if (stage.current) from.current = stage.current.getBoundingClientRect().height;
  };
}
