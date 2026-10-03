"use client";

import { useCallback, useEffect, useState } from "react";

const lit = new Set<HTMLElement>();
let pointer: PointerEvent | null = null;
let frame = 0;

function paint() {
  frame = 0;
  if (!pointer) return;
  const { clientX, clientY } = pointer;
  // Read every box first, then write, so the writes never force a layout between reads.
  const boxes = [...lit].map((element) => [element, element.getBoundingClientRect()] as const);
  for (const [element, box] of boxes) {
    // Panels well off screen keep their last light; nobody can see it.
    if (box.bottom < -200 || box.top > innerHeight + 200) continue;
    element.style.setProperty("--mx", `${clientX - box.left}px`);
    element.style.setProperty("--my", `${clientY - box.top}px`);
  }
}

function onPointerMove(event: PointerEvent) {
  pointer = event;
  if (!frame) frame = requestAnimationFrame(paint);
}

/**
 * Lights a panel's rim where the pointer is, even from outside the panel:
 * the element gets `--mx` and `--my`, the pointer's position over it, for a
 * radial gradient to follow. One listener serves every lit element.
 */
export function usePointerLight<T extends HTMLElement>(): (node: T | null) => void {
  const [element, setElement] = useState<T | null>(null);

  useEffect(() => {
    if (!element) return;
    if (lit.size === 0) addEventListener("pointermove", onPointerMove, { passive: true });
    lit.add(element);
    return () => {
      lit.delete(element);
      if (lit.size === 0) removeEventListener("pointermove", onPointerMove);
    };
  }, [element]);

  return useCallback((node: T | null) => setElement(node), []);
}
