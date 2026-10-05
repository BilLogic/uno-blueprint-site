/*
 * An in-page link glides the whole way to its section: eased in and out,
 * longer for longer trips, never more than GLIDE_MAX_MS. A pinned section on
 * the way (the walkthrough) is unpinned for the trip, so the page never seems
 * to stall on it. The glide itself is `hooks/use-in-page-glide.ts`.
 */

/** The shortest glide, however short the trip. */
const GLIDE_MIN_MS = 650;
/** The longest glide, however long the trip. */
const GLIDE_MAX_MS = 1600;
/** A glide's time before the trip's length is added. */
const GLIDE_BASE_MS = 520;
/** What each screen-height of the trip adds. */
const GLIDE_MS_PER_SCREEN = 170;
/** A trip shorter than this, in px, is jumped: there is nothing to see. */
const GLIDE_NEGLIGIBLE_PX = 2;

/** How long a glide `distance` px long takes on a screen `screenHeight` tall, in ms. */
export function glideDuration(distance: number, screenHeight: number): number {
  const ms = GLIDE_BASE_MS + (Math.abs(distance) / screenHeight) * GLIDE_MS_PER_SCREEN;
  return Math.min(GLIDE_MAX_MS, Math.max(GLIDE_MIN_MS, ms));
}

/** The glide's curve: a cubic ease in and out, from 0 to 1. */
export const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/** Where a glide aiming for the scroll position `targetScrollY` stops, kept within the page's scroll range. */
export const glideEnd = (targetScrollY: number, maxScroll: number) => Math.max(0, Math.min(maxScroll, targetScrollY));

/** Whether to jump instead of glide: for less motion, or a trip too short to see. */
export const glideJumps = (distance: number, reducedMotion: boolean) =>
  reducedMotion || Math.abs(distance) < GLIDE_NEGLIGIBLE_PX;

/**
 * Whether a pinned section (its page `top` and `bottom`) is held for a glide
 * from `from` to `to`: the trip passes through it, or ends within a screen of
 * its top, where unpinning it moves the page.
 */
export function onGlidePath(
  pin: { top: number; bottom: number },
  from: number,
  to: number,
  screenHeight: number,
): boolean {
  return Math.min(from, to) < pin.bottom && Math.max(from, to) > pin.top - screenHeight;
}

/** The id a link within the page points at, from its `href` attribute; null for a bare `#` or any other link. */
export function inPageTarget(href: string | null): string | null {
  if (!href?.startsWith("#")) return null;
  return href.slice(1) || null;
}

/** The keys that scroll the page, so pressing one stops a glide where it is. */
const SCROLL_KEYS: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

/** Whether pressing `key` (a `KeyboardEvent.key`) stops a glide. */
export const keyStopsGlide = (key: string) => SCROLL_KEYS.has(key);
