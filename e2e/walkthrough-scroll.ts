import type { Locator } from "@playwright/test";
import { structure } from "../content/structure";

const lengths = structure.steps.map((step) => step.scroll);
const total = lengths.reduce((sum, length) => sum + length, 0);

/** Scrolls to `progress` (0 to 1) through the pinned scroll of the walkthrough in `section`. */
export async function scrollToProgress(section: Locator, progress: number): Promise<void> {
  await section.evaluate((el, t) => {
    const pinned = [...el.querySelectorAll<HTMLElement>("*")].find((n) => getComputedStyle(n).position === "sticky");
    const scroller = pinned?.parentElement;
    if (!pinned || !scroller) throw new Error("no pinned walkthrough in the section");
    const top = scroller.getBoundingClientRect().top + window.scrollY;
    const stickyTop = parseFloat(getComputedStyle(pinned).top);
    window.scrollTo(0, top - stickyTop + t * (scroller.offsetHeight - pinned.offsetHeight));
  }, progress);
}

/** Scrolls to `share` of the way through step `index`'s scroll. */
export async function scrollToStep(section: Locator, index: number, share = 0.5): Promise<void> {
  const before = lengths.slice(0, index).reduce((sum, length) => sum + length, 0);
  await scrollToProgress(section, (before + lengths[index]! * share) / total);
}

/** The scroll position where the walkthrough in `section` lets go of its frame: the end of its pinned scroll. */
export async function exitScroll(section: Locator): Promise<number> {
  return section.evaluate((el) => {
    const pinned = [...el.querySelectorAll<HTMLElement>("*")].find((n) => getComputedStyle(n).position === "sticky");
    const scroller = pinned?.parentElement;
    if (!pinned || !scroller) throw new Error("no pinned walkthrough in the section");
    const top = scroller.getBoundingClientRect().top + window.scrollY;
    return top - parseFloat(getComputedStyle(pinned).top) + scroller.offsetHeight - pinned.offsetHeight;
  });
}
