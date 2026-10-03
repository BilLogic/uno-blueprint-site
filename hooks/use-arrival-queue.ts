"use client";

import { useCallback, useEffect, useState } from "react";
import { queueArrivals } from "@/lib/bento";
import { useReducedMotion } from "./use-media-query";

/**
 * Which children of a container have arrived. Each child arrives once it is
 * properly on screen (its top edge above `rootMargin`'s line), and children
 * that come into view together, or while others are still arriving, queue up
 * one beat apart in document order. Pass the returned ref to the container.
 * With reduced motion everything has arrived.
 */
export function useArrivalQueue<T extends Element>({
  rootMargin = "0px",
}: { rootMargin?: string } = {}): [
  ref: (node: T | null) => void,
  arrived: (index: number) => boolean,
] {
  const [container, setContainer] = useState<T | null>(null);
  const [landed, setLanded] = useState<ReadonlySet<number>>(new Set());
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!container || reducedMotion) return;
    const items = [...container.children];
    const timers: number[] = [];
    let nextFree = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => items.indexOf(entry.target))
          .sort((a, b) => a - b);
        const queued = queueArrivals(seen.length, performance.now(), nextFree);
        nextFree = queued.nextFree;
        seen.forEach((index, k) => {
          observer.unobserve(items[index]!);
          timers.push(
            window.setTimeout(
              () => setLanded((before) => new Set(before).add(index)),
              queued.delays[k],
            ),
          );
        });
      },
      { rootMargin, threshold: 0 },
    );
    for (const item of items) observer.observe(item);
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [container, reducedMotion, rootMargin]);

  const ref = useCallback((node: T | null) => setContainer(node), []);
  const arrived = useCallback(
    (index: number) => reducedMotion || landed.has(index),
    [reducedMotion, landed],
  );
  return [ref, arrived];
}
