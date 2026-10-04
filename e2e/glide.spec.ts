import { expect, test, type Page } from "@playwright/test";
import { getStarted } from "../content/get-started";
import { hero } from "../content/hero";

/** The longest a glide takes, plus room for the frames around it. */
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
      await page.goto("/");
      await sample(page);
      await cta(page).click();

      await expect
        .poll(
          async () => {
            const { top, margin } = await landing(page);
            return Math.abs(top - margin);
          },
          { timeout: GLIDE_TIMEOUT },
        )
        .toBeLessThan(2);

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
      await page.waitForTimeout(SETTLE_MS);
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
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await cta(page).click();
    await page.waitForTimeout(INTERRUPT_AFTER_MS);
    await page.mouse.move(1400, 450);
    await interrupt(page);
    await page.waitForTimeout(STOP_SETTLE_MS);
    const stopped = await page.evaluate(() => scrollY);
    await page.waitForTimeout(GLIDE_TIMEOUT);
    expect(Math.abs((await page.evaluate(() => scrollY)) - stopped)).toBeLessThan(4);
    const { top, margin } = await landing(page);
    expect(top - margin).toBeGreaterThan(100);
  });
}

test("a link taken from the keyboard hands focus to its section, so Tab carries on from there", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await cta(page).focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(
      async () => {
        const { top, margin } = await landing(page);
        return Math.abs(top - margin);
      },
      { timeout: GLIDE_TIMEOUT },
    )
    .toBeLessThan(2);
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
