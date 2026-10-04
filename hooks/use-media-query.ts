"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a media query matches, kept current. Before hydration it reads
 * `serverValue`, so the static HTML renders one known state.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => matchMedia(query).matches,
    () => serverValue,
  );
}

/** The query for a reader who asked for less motion. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** The reader asked for less motion: show each animation's end state. */
export const useReducedMotion = () => useMediaQuery(REDUCED_MOTION_QUERY);

/** A touch screen with no hover: pictures that play on hover play by themselves. */
export const useNoHover = () => useMediaQuery("(hover: none)");

/** Wider than a phone: the prototype's (max-width:760px) turned round, in step with --breakpoint-md. */
export const useWide = () => useMediaQuery("(min-width: 761px)");
