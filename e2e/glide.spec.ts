import { expect, test, type Page } from "@playwright/test";
import { getStarted } from "../content/get-started";
import { hero } from "../content/hero";

/** The longest a glide takes, plus room for the frames around it. */
const GLIDE_TIMEOUT = 2_500;

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
      await page.waitForTimeout(600);
      expect((await landing(page)).top).toBeCloseTo(before.top, 0);
      expect(page.url()).not.toContain("#");
    });
  });
}

test("a wheel stops the glide where it is", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await cta(page).click();
  await page.waitForTimeout(250);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 1);
  await page.waitForTimeout(300);
  const stopped = await page.evaluate(() => scrollY);
  await page.waitForTimeout(GLIDE_TIMEOUT);
  expect(Math.abs((await page.evaluate(() => scrollY)) - stopped)).toBeLessThan(4);
  const { top, margin } = await landing(page);
  expect(top - margin).toBeGreaterThan(100);
});

test("with reduced motion the link jumps", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await cta(page).click();
  const { top, margin } = await landing(page);
  expect(Math.abs(top - margin)).toBeLessThan(2);
});
