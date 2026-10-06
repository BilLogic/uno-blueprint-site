import { expect, test, type Page } from "@playwright/test";
import { touchPoints } from "@/content/touch-points";

/*
 * A phone's browser toolbar that hides as the page scrolls, and shows again,
 * changes only the viewport's height. The test browser has no such toolbar, so
 * the viewport is made taller and back, as the toolbar would.
 */

const WIDTH = 375;
const TALL = 812;
const SHORT = 750;
/** Longer than any handler waits for a resize to settle. */
const SETTLE = 600;

const harness = (page: Page) =>
  page.locator("section", { has: page.getByRole("heading", { name: "Harness for your agents." }) });
const touchPointsSection = (page: Page) =>
  page.locator("section", { has: page.getByRole("tablist", { name: touchPoints.tabsLabel }) });

/** What a toolbar must leave alone: where Touch points starts in the page, the Harness's height, and its picture's run. */
async function layout(page: Page) {
  const touchTop = await touchPointsSection(page).evaluate((node) => Math.round(node.getBoundingClientRect().top + scrollY));
  const harnessHeight = await harness(page).evaluate((node) => Math.round(node.getBoundingClientRect().height));
  const run = await harness(page).locator("[data-run]").getAttribute("data-run");
  return { touchTop, harnessHeight, run };
}

/** Scrolls so the foot of the Harness and the head of Touch points are both on screen, and waits for the Harness's picture to have drawn something. */
async function showHarnessFoot(page: Page) {
  await page.goto("/");
  const top = await touchPointsSection(page).evaluate((node) => node.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top - SHORT / 2);
  await expect(harness(page).locator("[data-shown]")).toBeVisible();
  // Far enough in that a restart would show.
  await page.waitForTimeout(1500);
}

/** Makes the viewport taller, as the toolbar hiding does, then short again as it shows, and returns `measure` after each. */
async function toolbar<T>(page: Page, width: number, measure: () => Promise<T>) {
  await page.setViewportSize({ width, height: TALL });
  await page.waitForTimeout(SETTLE);
  const hidden = await measure();
  await page.setViewportSize({ width, height: SHORT });
  await page.waitForTimeout(SETTLE);
  return [hidden, await measure()];
}

/** How far below the viewport's top the walkthrough's frame ends, once pinned. */
async function pinnedFoot(page: Page) {
  const pin = page.locator("[data-pin]");
  const top = await pin.evaluate((node) => node.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top + 200);
  return page.locator("[data-pin-frame]").evaluate((node) => node.getBoundingClientRect().bottom);
}

test.describe("on a phone", () => {
  // Loaded as a page usually is, with the toolbar showing.
  test.use({ viewport: { width: WIDTH, height: SHORT }, hasTouch: true, isMobile: true });

  test("loaded with the toolbar hidden, the walkthrough keeps its fit as the viewport grows, and fits again once it is shorter", async ({
    page,
  }) => {
    // Here the page loads at SHORT with the toolbar hidden, as a page restored mid-scroll may.
    const SHORTER = 700;
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const before = await layout(page);
    await page.setViewportSize({ width: WIDTH, height: TALL });
    await page.waitForTimeout(SETTLE);
    expect(await layout(page)).toEqual(before);

    await page.setViewportSize({ width: WIDTH, height: SHORTER });
    await page.waitForTimeout(SETTLE);
    expect(await pinnedFoot(page)).toBeLessThanOrEqual(SHORTER);
  });

  test("the browser's toolbar hiding and showing again moves nothing below the walkthrough and restarts no picture", async ({
    page,
  }) => {
    await showHarnessFoot(page);
    const before = await layout(page);
    expect(before.run).toMatch(/^\d+$/);
    expect(await toolbar(page, WIDTH, () => layout(page))).toEqual([before, before]);
  });
});

// A desktop window made taller or shorter fits the walkthrough above to it again,
// and so moves what is below; the Harness's picture still has no reason to restart.
test("at 1440 px a window made taller and short again leaves the Harness's picture running", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: SHORT });
  await showHarnessFoot(page);
  const harnessOnly = async () => {
    const { harnessHeight, run } = await layout(page);
    return { harnessHeight, run };
  };
  const before = await harnessOnly();
  expect(before.run).toMatch(/^\d+$/);
  expect(await toolbar(page, 1440, harnessOnly)).toEqual([before, before]);
});
