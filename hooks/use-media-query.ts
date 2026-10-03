"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a media query matches, kept current. Before hydration it reads
 * `serverValue`, so the static HTML renders one known state.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => matchMedia(query).matches,
    () => serverValue,
  );
}

/** The reader asked for less motion: show each animation's end state. */
export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** A touch screen with no hover: pictures that play on hover play by themselves. */
export const useNoHover = () => useMediaQuery("(hover: none)");
