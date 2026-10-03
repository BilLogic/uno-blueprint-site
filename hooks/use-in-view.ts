"use client";

import { useEffect, useState, type RefObject } from "react";

type InViewOptions = {
  /** Shrinks or grows the viewport the element is tested against, as in IntersectionObserver. */
  rootMargin?: string;
  threshold?: number;
  /** Stay true after the first time the element is seen. */
  once?: boolean;
};

/** Whether `ref`'s element is on screen. */
export function useInView(
  ref: RefObject<Element | null>,
  { rootMargin = "0px", threshold = 0, once = false }: InViewOptions = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.some((entry) => entry.isIntersecting);
        setInView(seen);
        if (seen && once) observer.disconnect();
      },
      { rootMargin, threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold, once]);

  return inView;
}
