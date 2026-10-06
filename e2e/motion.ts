import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Reading a stage's motion mid-flight, for the demo stages and the harness
 * showcase alike. The motion's numbers are as styles/tokens.css has them.
 * Mid-flight checks are at fixed times, not fractions of a duration, so a
 * curve that reads as instant fails them however long it nominally lasts.
 */
export const RECORDING_ENTRY_DELAY = 220; // --delay-recording-entry
export const RECORDING_ENTRY_MS = 640; // --duration-recording-entry
export const ARRIVE_DELAY = 100; // --delay-recording-arrive
export const GLIDE_MS = 560; // --duration-stage-glide
export const STAGGER = 30; // lib/caption.ts

/** Counts, on each element matching `selector`, the animations the page starts on it (`data-animated`), from before the page loads. */
export async function countAnimations(page: Page, selector: string) {
  await page.addInitScript((selector) => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args: Parameters<Element["animate"]>) {
      if (this instanceof HTMLElement && this.matches(selector)) {
        this.dataset.animated = String(Number(this.dataset.animated ?? 0) + 1);
      }
      return animate.apply(this, args);
    };
  }, selector);
}

/** What an element looks like now, mid-animation included: its opacity, how far down it is moved, its scale and its blur. */
export const look = (element: Locator) =>
  element.evaluate((node) => {
    const style = getComputedStyle(node);
    const matrix = new DOMMatrix(style.transform === "none" ? undefined : style.transform);
    return {
      opacity: Number(style.opacity),
      down: matrix.m42,
      scale: matrix.a,
      blur: Number(/blur\(([\d.]+)px\)/.exec(style.filter)?.[1] ?? 0),
    };
  });

/** The scripted animations running in `root`, leaving out the CSS transitions and animations a picture runs on its own. */
export const scripted = (root: Locator) =>
  root.evaluate(
    (node) =>
      node
        .getAnimations({ subtree: true })
        .filter((animation) => !(animation instanceof CSSTransition || animation instanceof CSSAnimation)).length,
  );

/**
 * Pauses every animation in the section holding `root`, at its first frame,
 * the moment `root` next changes as `options` says, before a frame is drawn:
 * so the change can be read mid-flight however fast the machine is. `seek`
 * moves them on, and `finishAll` runs them to their end.
 */
export const freezeNext = (root: Locator, options: MutationObserverInit) =>
  root.evaluate((node, options) => {
    const section = node.closest("section") ?? node;
    const observer = new MutationObserver(() => {
      observer.disconnect();
      for (const animation of section.getAnimations({ subtree: true })) animation.pause();
    });
    observer.observe(node, options);
  }, options);

export const seek = (root: Locator, ms: number) =>
  root.evaluate((node, ms) => {
    for (const animation of node.getAnimations({ subtree: true })) if (animation.playState === "paused") animation.currentTime = ms;
  }, ms);

export const finishAll = (root: Locator) =>
  root.evaluate((node) => {
    for (const animation of node.getAnimations({ subtree: true })) animation.finish();
  });

/** The layer showing of a caption drawn word by word. */
export const shownCaptionIn = (root: Locator) => root.locator('[data-caption] > [data-phase="in"]');

/** Each word of the caption showing in `root`: its text, and when it starts to arrive, in ms. */
export const captionWords = (root: Locator) =>
  shownCaptionIn(root).evaluate((layer) =>
    [...layer.querySelectorAll<HTMLElement>("b > span, p > span")].map((word) => ({
      text: word.textContent,
      delay: parseFloat(getComputedStyle(word).transitionDelay) * 1000,
      moving: word.getAnimations().length > 0,
    })),
  );

/** Expects the caption's words to arrive one by one: the title at `start`, then each word `STAGGER` ms (or less, on a long line) after the one before. */
export function expectWordByWord(words: { text: string | null; delay: number; moving: boolean }[], tab: { label: string; caption: string }, start: number) {
  expect(words.map((word) => word.text)).toEqual([`${tab.label}.`, ...tab.caption.split(" ")]);
  expect(words.every((word) => word.moving)).toBe(true);
  const [title, ...rest] = words.map((word) => Math.round(word.delay));
  expect(title).toBe(start);
  expect(rest[0]).toBe(start + STAGGER);
  // Later words, line by line, never start before the line's first one, and wait at most a stagger each.
  for (const delay of rest) {
    expect(delay).toBeGreaterThanOrEqual(start + STAGGER);
    expect(delay).toBeLessThanOrEqual(start + STAGGER + 120);
  }
  expect(new Set(rest).size).toBeGreaterThan(1);
}
