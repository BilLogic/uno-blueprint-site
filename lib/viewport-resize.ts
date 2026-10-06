/*
 * A phone's browser toolbar that hides as the page scrolls, and shows again,
 * resizes the viewport, but only its height. A picture laid out by the page's
 * width has nothing to move for that, and restarting it, or laying the page
 * out again, would make everything below it jump under the reader's thumb.
 */

/**
 * Tells a resize that changed the viewport's width from one that changed only
 * its height: called with the width after each resize, it says whether the
 * width differs from the one it was last given (to begin with, `width`).
 */
export function widthChange(width: number): (now: number) => boolean {
  let last = width;
  return (now) => {
    const changed = now !== last;
    last = now;
    return changed;
  };
}
