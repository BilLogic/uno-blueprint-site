"use client";

import { useCallback, useEffect, useState } from "react";

type InViewOptions = {
  /** Shrinks or grows the viewport the element is tested against, as in IntersectionObserver. */
  rootMargin?: string;
  threshold?: number;
  /** Stay true after the first time the element is seen. */
  once?: boolean;
};

/**
 * Whether an element is on screen. Pass the returned ref to the element; one
 * that mounts later, or is swapped for another, is observed when it arrives.
 */
export function useInView<T extends Element>({
  rootMargin = "0px",
  threshold = 0,
  once = false,
}: InViewOptions = {}): [ref: (node: T | null) => void, inView: boolean] {
  const [element, setElement] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  const seenForGood = once && inView;

  useEffect(() => {
    if (!element || seenForGood) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // A batch can hold several entries for the element; the last is current.
        const seen = entries.at(-1)?.isIntersecting ?? false;
        setInView(seen);
        if (seen && once) observer.disconnect();
      },
      { rootMargin, threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, rootMargin, threshold, once, seenForGood]);

  const ref = useCallback((node: T | null) => setElement(node), []);
  return [ref, inView];
}
