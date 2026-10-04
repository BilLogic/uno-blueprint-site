/*
 * Whether an in-page glide is running (see `use-in-page-glide`). A section
 * driven by the scroll reads `isGliding` and leaves the scroll alone while it
 * is on; the glide announces a scroll as it ends, so the section reads once
 * then.
 */

let gliding = false;

/** Whether a glide is running. */
export const isGliding = () => gliding;

/** Turns the signal on as a glide starts, and off as it ends. */
export function setGliding(on: boolean) {
  gliding = on;
}
