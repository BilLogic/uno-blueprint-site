import { expect, test, type Page } from "@playwright/test";
import { getStarted } from "../content/get-started";
import { hero } from "../content/hero";
import { FRAME, installClock, realFrames, runUntil, stopClockASecondOn, tick } from "./clock";

/** The longest a glide takes, plus room for the frames around it, by the page's clock. */
const GLIDE_TIMEOUT = 2_500;

/** How long the view is watched after arrival, to see it hold its place. */
const SETTLE_MS = 600;
/** How far into a glide a reader interrupts it. */
const INTERRUPT_AFTER_MS = 250;
/** Long enough for an interrupted glide to have taken another frame, had it not stopped. */
const STOP_SETTLE_MS = 300;

const cta = (page: Page) => page.locator("main").getByRole("link", { name: hero.primary.label }).first();

/** Where the Get started section's top sits on the screen, and the scroll margin it lands at. */
const landing = (page: Page) =>
  page.evaluate((id) => {
    const target = document.getElementById(id)!;
    return { top: target.getBoundingClientRect().top, margin: parseFloat(getComputedStyle(target).scrollMarginTop) };
  }, getStarted.id);

/** How far the Get started section's top sits from where it lands, in px. */
const offLanding = async (page: Page) => {
  const { top, margin } = await landing(page);
  return Math.abs(top - margin);
};

/**
 * Runs the page's stopped clock a frame at a time until the glide has landed
 * on Get started and finished: on arrival it hands focus to the section.
 */
const untilLanded = (page: Page) =>
  runUntil(
    page,
    async () =>
      (await offLanding(page)) < 2 &&
      (await page.evaluate((id) => document.getElementById(id)!.contains(document.activeElement), getStarted.id)),
    { step: FRAME, limit: GLIDE_TIMEOUT },
  );

/** Waits until the browser's own scrolling, a key's smooth scroll among it, has come to rest. */
const browserAtRest = (page: Page) =>
  expect
    .poll(async () => {
      const before = await page.evaluate(() => scrollY);
      await realFrames(page);
      return (await page.evaluate(() => scrollY)) === before;
    })
    .toBe(true);

/** Notes the scroll position on every frame from now on. */
const sample = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { ys: number[] };
    w.ys = [];
    const note = () => {
      w.ys.push(scrollY);
      requestAnimationFrame(note);
    };
    requestAnimationFrame(note);
  });

const samples = (page: Page) => page.evaluate(() => (window as unknown as { ys: number[] }).ys);

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`at ${viewport.width}`, () => {
    test.use({ viewport });

    test("Get the template glides past the walkthrough to Get started and holds there", async ({ page }) => {
      // The glide is drawn frame by frame on the page's clock, stepped a frame at a time, so its frames
      // are counted the same however fast the machine draws them.
      await installClock(page);
      await page.goto("/");
      await stopClockASecondOn(page);
      await sample(page);
      await cta(page).click();
      await untilLanded(page);

      // It kept moving the whole way: no run of still frames before it arrived.
      const ys = await samples(page);
      const end = ys.findIndex((y) => y === ys.at(-1));
      const moving = ys.slice(
        ys.findIndex((y) => y > 0),
        end,
      );
      const longestStill = moving.reduce(
        (run, y, i) => ({ now: y === moving[i - 1] ? run.now + 1 : 0, most: Math.max(run.most, run.now) }),
        { now: 0, most: 0 },
      ).most;
      expect(longestStill).toBeLessThan(4);
      // And it was a glide, over many frames, not a jump.
      expect(moving.length).toBeGreaterThan(20);

      // The walkthrough is pinned again, and the target holds its place.
      const before = await landing(page);
      await page.clock.runFor(SETTLE_MS);
      await realFrames(page);
      expect((await landing(page)).top).toBeCloseTo(before.top, 0);
      expect(page.url()).not.toContain("#");
    });
  });
}

for (const [how, interrupt] of [
  ["a wheel", (page: Page) => page.mouse.wheel(0, 1)],
  ["a scrolling key", (page: Page) => page.keyboard.press("ArrowDown")],
  ["a press", (page: Page) => page.mouse.down().then(() => page.mouse.up())],
] as const) {
  test(`${how} stops the glide where it is`, async ({ page }) => {
    await installClock(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await stopClockASecondOn(page);
    await cta(page).click();
    await page.clock.runFor(INTERRUPT_AFTER_MS);
    await page.mouse.move(1400, 450);
    await interrupt(page);
    await tick(page, STOP_SETTLE_MS);
    await browserAtRest(page);
    const stopped = await page.evaluate(() => scrollY);
    await page.clock.runFor(GLIDE_TIMEOUT);
    await realFrames(page);
    expect(Math.abs((await page.evaluate(() => scrollY)) - stopped)).toBeLessThan(4);
    const { top, margin } = await landing(page);
    expect(top - margin).toBeGreaterThan(100);
  });
}

test("a link taken from the keyboard hands focus to its section, so Tab carries on from there", async ({ page }) => {
  await installClock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await stopClockASecondOn(page);
  await cta(page).focus();
  await page.keyboard.press("Enter");
  await untilLanded(page);
  await page.keyboard.press("Tab");
  const inside = await page.evaluate(
    (id) => document.getElementById(id)!.contains(document.activeElement),
    getStarted.id,
  );
  expect(inside).toBe(true);
});

test("with reduced motion the link jumps", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await cta(page).click();
  const { top, margin } = await landing(page);
  expect(Math.abs(top - margin)).toBeLessThan(2);
});
