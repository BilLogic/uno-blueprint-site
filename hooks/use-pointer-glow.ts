"use client";

import { useEffect, type RefObject } from "react";
import { useNoHover } from "@/hooks/use-media-query";

/**
 * Lights a panel's rim near the pointer: keeps `--mx` and `--my` on the
 * element at the pointer's position relative to it, for a radial gradient in
 * its border to follow. Panels far off screen are left alone.
 */
export function usePointerGlow(panel: RefObject<HTMLElement | null>) {
  // A touch screen has no pointer to follow.
  const noHover = useNoHover();
  useEffect(() => {
    if (noHover) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const update = () => {
      frame = 0;
      const element = panel.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > innerHeight + 200) return;
      element.style.setProperty("--mx", `${x - rect.left}px`);
      element.style.setProperty("--my", `${y - rect.top}px`);
    };
    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(update);
    };
    addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("pointermove", onMove);
    };
  }, [panel, noHover]);
}
