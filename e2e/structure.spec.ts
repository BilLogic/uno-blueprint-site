import { expect, test, type Page } from "@playwright/test";
import { structure } from "../content/structure";

const heading = `${structure.heading.lead} ${structure.heading.main}`;
const titles = structure.steps.map((step) => step.title);

const section = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: heading }) });

/** The caption's title as the reader sees it now. */
const captionTitle = (page: Page) => section(page).locator("[aria-live] b").textContent();

/**
 * Scrolls through the whole section a little at a time, noting each caption
 * title as it changes and the most the page is ever wider than the screen.
 */
async function scrollThrough(page: Page) {
  const box = await section(page).boundingBox();
  if (!box) throw new Error("the structure section is not on the page");
  const seen: string[] = [];
  let overflow = 0;
  const end = box.y + box.height;
  for (let y = box.y - 200; y < end; y += 120) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    // Scroll is read on the next frame.
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    const title = await captionTitle(page);
    if (title && seen.at(-1) !== title) seen.push(title);
    overflow = Math.max(
      overflow,
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    );
  }
  return { seen, overflow };
}

test.describe("structure walkthrough", () => {
  test("scrolling down reads every step in order, one caption at a time", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    expect((await scrollThrough(page)).seen).toEqual(titles);
  });

  test("on a phone the walkthrough reads the same steps, with nothing wider than the screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const { seen, overflow } = await scrollThrough(page);
    expect(seen).toEqual(titles);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("scrolling back up returns to the first step", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await scrollThrough(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(section(page).locator("[aria-live] b")).toHaveText(titles[0]!);
  });

  test("with reduced motion the last step shows at once and the section does not pin", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const caption = section(page).locator("[aria-live]");
    await expect(caption.locator("b")).toHaveText(titles.at(-1)!);
    await expect(caption.locator("p")).toHaveText(structure.steps.at(-1)!.caption);
    const box = await section(page).boundingBox();
    expect(box!.height).toBeLessThan(2 * 900);
  });
});
