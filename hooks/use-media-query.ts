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

/** A touch screen with no hover. */
export const NO_HOVER_QUERY = "(hover: none)";

/**
 * Below the md and lg breakpoints: the prototype's (max-width:760px) and
 * (max-width:900px), in step with --breakpoint-md and --breakpoint-lg in
 * styles/tokens.css and so with Tailwind's `max-md:` and `max-lg:`.
 */
export const BELOW_MD_QUERY = "(max-width: 760px)";
export const BELOW_LG_QUERY = "(max-width: 900px)";

/** The reader asked for less motion: show each animation's end state. */
export const useReducedMotion = () => useMediaQuery(REDUCED_MOTION_QUERY);

/** A touch screen with no hover: pictures that play on hover play by themselves. */
export const useNoHover = () => useMediaQuery(NO_HOVER_QUERY);

/** Wider than a phone: at or above the md breakpoint. */
export const useWide = () => !useMediaQuery(BELOW_MD_QUERY, true);
