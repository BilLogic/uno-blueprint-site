"use client";

import { useEffect, useRef } from "react";

/** How far outside the viewport a panel still follows the pointer. */
const REACH = 200;

/**
 * Lights a panel's rim where the pointer is, through `--mx` and `--my` (see
 * the `rim-light` utility). One update per frame at most, and none for a panel
 * well off screen.
 */
export function usePointerLight<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    let frame = 0;
    let event: PointerEvent | undefined;
    const update = () => {
      frame = 0;
      const panel = ref.current;
      if (!panel || !event) return;
      const box = panel.getBoundingClientRect();
      if (box.bottom < -REACH || box.top > innerHeight + REACH) return;
      panel.style.setProperty("--mx", `${event.clientX - box.left}px`);
      panel.style.setProperty("--my", `${event.clientY - box.top}px`);
    };
    const onMove = (next: PointerEvent) => {
      event = next;
      if (!frame) frame = requestAnimationFrame(update);
    };
    addEventListener("pointermove", onMove, { passive: true });
    return () => {
      removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
