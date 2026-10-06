import type { Locator, Page } from "@playwright/test";

type Frames = { realFrame?: typeof requestAnimationFrame };

/** A frame of the page's clock, in ms. */
export const FRAME = 16;

/**
 * Keeps hold of the browser's own `requestAnimationFrame`, for `realFrames`;
 * call it before the page loads. It must come before `page.clock.install`,
 * which replaces it: init scripts run in the order they were added.
 */
export async function keepRealFrames(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as Frames).realFrame = requestAnimationFrame.bind(window);
  });
}

/**
 * Installs Playwright's clock on `page`; call it before the page loads. The
 * clock runs on its own until `stopClockASecondOn`; from then on the page's
 * timers, its animation frames and `performance.now` move only as the test
 * steps them (`page.clock.runFor`, `tick`), so what the page does at a given
 * moment no longer depends on how fast the machine is. Scrolling, input and
 * CSS transitions still run on the browser's own time: `realFrames` waits for
 * those.
 */
export async function installClock(page: Page): Promise<void> {
  await keepRealFrames(page);
  await page.clock.install();
}

/**
 * Runs the page's clock a second on, firing what falls due, and stops it
 * there. Playwright stops a clock only at a time still to come.
 */
export async function stopClockASecondOn(page: Page): Promise<void> {
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
}

/**
 * Waits two of the browser's own frames, whatever the page's clock is doing: a
 * scroll, a resize or an input asked for before now has been applied, and the
 * page has heard of it. Needs `keepRealFrames` (or `installClock`).
 */
export const realFrames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((done) => {
        const frame = (window as Frames).realFrame;
        if (!frame) throw new Error("realFrames needs keepRealFrames or installClock before the page loads");
        frame(() => frame(() => done()));
      }),
  );

/** Lets a scroll, a resize or an input asked for before now reach the page, then runs its stopped clock `ms` on. */
export async function tick(page: Page, ms: number): Promise<void> {
  await realFrames(page);
  await page.clock.runFor(ms);
}

/**
 * Runs the page's stopped clock on, `step` ms at a time, until `done` holds,
 * and throws once `limit` ms of the page's time have passed without it.
 */
export async function runUntil(
  page: Page,
  done: () => Promise<boolean>,
  { step = 100, limit = 30_000 }: { step?: number; limit?: number } = {},
): Promise<void> {
  for (let ran = 0; !(await done()); ran += step) {
    if (ran >= limit) throw new Error(`still waiting after ${limit} ms of the page's clock`);
    await page.clock.runFor(step);
    await flushRenders(page);
  }
}

/** Resolves once every CSS transition in `root`, and in what it holds, has finished or been cancelled. */
export const transitionsDone = (root: Locator) =>
  root.evaluate(async (element) => {
    const running = element.getAnimations({ subtree: true }).filter((animation) => animation instanceof CSSTransition);
    await Promise.allSettled(running.map((animation) => animation.finished));
  });

/**
 * Lets React finish rendering what the clock last set in motion: its renders
 * are queued as messages, which a stopped clock does not hold.
 */
export const flushRenders = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((done) => {
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = () => done();
        port2.postMessage(null);
      }),
  );
