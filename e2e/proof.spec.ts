import { expect, test, type Page } from "@playwright/test";

const chart = (page: Page) => page.locator("#proof");
const value = (page: Page, text: string) => chart(page).getByText(text, { exact: true });

/** Scrolls so the top of the chart's plot sits `fromTop` px below the top of the screen. */
async function scrollPlotTo(page: Page, fromTop: number) {
  await page.evaluate((offset) => {
    const plot = document.querySelector("#proof [data-pair]")!;
    scrollTo(0, plot.getBoundingClientRect().top + scrollY - offset);
  }, fromTop);
}

/** The height of the bar a value label sits on. */
const barHeight = (page: Page, text: string) =>
  value(page, text).evaluate((label) => label.parentElement!.getBoundingClientRect().height);

test.describe("on a wide screen", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the chart is revealed whole, once", async ({ page }) => {
    await page.goto("/");
    await scrollPlotTo(page, 900);
    await expect.poll(() => barHeight(page, "71%")).toBeLessThan(2);
    await expect(value(page, "71%")).toHaveCSS("opacity", "0");

    // Well into view: every pair grows in full and shows its values.
    await scrollPlotTo(page, 300);
    await expect.poll(() => barHeight(page, "71%")).toBeCloseTo(0.71 * 230, 0);
    await expect.poll(() => barHeight(page, "108k")).toBeCloseTo((108 / 180) * 230, 0);
    await expect(value(page, "71%")).toHaveCSS("opacity", "1");
    await expect(value(page, "108k")).toHaveCSS("opacity", "1");

    // Scrolling back does not hide it again.
    await scrollPlotTo(page, 900);
    await page.waitForTimeout(1000);
    expect(await barHeight(page, "71%")).toBeCloseTo(0.71 * 230, 0);
  });

  test("each measure explains itself on hover and on focus", async ({ page }) => {
    await page.goto("/");
    const accuracy = page.getByRole("button", { name: "Accuracy", exact: true });
    await expect(accuracy).toHaveAccessibleDescription(/share the agent got right/);
    const tip = chart(page).getByText(/share the agent got right/);
    await expect(tip).toHaveCSS("opacity", "0");
    await accuracy.scrollIntoViewIfNeeded();
    await accuracy.hover();
    await expect(tip).toHaveCSS("opacity", "1");
    await page.mouse.move(0, 0);
    await expect(tip).toHaveCSS("opacity", "0");
    await accuracy.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(tip).toHaveCSS("opacity", "1");
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the chart is revealed whole, once", async ({ page }) => {
    await page.goto("/");
    await scrollPlotTo(page, 844);
    await expect.poll(() => barHeight(page, "71%")).toBeLessThan(2);

    await scrollPlotTo(page, 300);
    // Every pair grows, on the phone's shorter scale, and shows its values.
    await expect.poll(() => barHeight(page, "71%")).toBeCloseTo(0.71 * 160, 0);
    await expect.poll(() => barHeight(page, "108k")).toBeCloseTo((108 / 180) * 160, 0);
    await expect(value(page, "108k")).toHaveCSS("opacity", "1");

    // Scrolling back does not hide it again.
    await scrollPlotTo(page, 844);
    await page.waitForTimeout(1000);
    expect(await barHeight(page, "71%")).toBeCloseTo(0.71 * 160, 0);
  });
});

test("with reduced motion the chart is drawn in full from the start", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await scrollPlotTo(page, 900);
  expect(await barHeight(page, "71%")).toBeCloseTo(0.71 * 230, 0);
  await expect(value(page, "29%")).toHaveCSS("opacity", "1");
});
