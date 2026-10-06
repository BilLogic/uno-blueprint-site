import { expect, test, type Page } from "@playwright/test";
import { touchPoints } from "@/content/touch-points";

/*
 * A phone's browser toolbar that hides as the page scrolls, and shows again,
 * changes only the viewport's height. The test browser has no such toolbar, so
 * the viewport is made shorter and back, as the toolbar would.
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
const layout = (page: Page) =>
  page.evaluate((tabsLabel) => {
    const sections = [...document.querySelectorAll("main section")];
    const harness = sections.find((section) => section.querySelector("h2")?.textContent?.includes("Harness for your agents."));
    const touch = sections.find((section) => section.querySelector(`[role="tablist"][aria-label="${tabsLabel}"]`));
    if (!harness || !touch) throw new Error("no Harness or Touch points section");
    return {
      touchTop: Math.round(touch.getBoundingClientRect().top + scrollY),
      harnessHeight: Math.round(harness.getBoundingClientRect().height),
      run: harness.querySelector("[data-run]")?.getAttribute("data-run"),
    };
  }, touchPoints.tabsLabel);

/** Scrolls so the foot of the Harness and the head of Touch points are both on screen, and waits for the Harness's picture to have drawn something. */
async function showHarnessFoot(page: Page) {
  await page.goto("/");
  const top = await touchPointsSection(page).evaluate((node) => node.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top - TALL / 2);
  await expect(harness(page).locator("[data-shown]")).toBeVisible();
  // Far enough in that a restart would show.
  await page.waitForTimeout(1500);
}

/** Makes the viewport shorter, as a toolbar showing does, then tall again, and returns `measure` after each. */
async function toolbar<T>(page: Page, width: number, measure: () => Promise<T>) {
  await page.setViewportSize({ width, height: SHORT });
  await page.waitForTimeout(SETTLE);
  const short = await measure();
  await page.setViewportSize({ width, height: TALL });
  await page.waitForTimeout(SETTLE);
  return [short, await measure()];
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: WIDTH, height: TALL }, hasTouch: true, isMobile: true });

  test("the browser's toolbar hiding and showing again moves nothing below the walkthrough and restarts no picture", async ({
    page,
  }) => {
    await showHarnessFoot(page);
    const before = await layout(page);
    expect(await toolbar(page, WIDTH, () => layout(page))).toEqual([before, before]);
  });
});

// A desktop window made shorter fits the walkthrough above to it again, and so
// moves what is below; the Harness's picture still has no reason to restart.
test("at 1440 px a window made shorter and tall again leaves the Harness's picture running", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: TALL });
  await showHarnessFoot(page);
  const harnessOnly = async () => {
    const { harnessHeight, run } = await layout(page);
    return { harnessHeight, run };
  };
  const before = await harnessOnly();
  expect(await toolbar(page, 1440, harnessOnly)).toEqual([before, before]);
});
