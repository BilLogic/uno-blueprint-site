import { devices, expect, test, type Page } from "@playwright/test";

const titles = [
  "Uno map, duo users",
  "Built for RAG",
  "Uno team or every team",
  "Product context, built in",
  "Sources stay attached",
] as const;

const panel = (page: Page, title: (typeof titles)[number]) =>
  page.getByRole("group", { name: title });

/** The product-context picture's status reads "Planned" at rest and "Live" while it plays. */
const live = (page: Page) =>
  panel(page, "Product context, built in").getByText("Live", { exact: true });

test.describe("bento", () => {
  test("panels arrive as they scroll into view, one beat apart along a row", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(panel(page, titles[0])).toHaveCSS("opacity", "0");

    // Note when each panel first shows, frame by frame, while the reader scrolls down.
    await page.evaluate((names) => {
      const panels = names.map((name) =>
        [...document.querySelectorAll<HTMLElement>('[role="group"]')].find(
          (p) => p.querySelector("h3")?.textContent === name,
        )!,
      );
      const shown: number[] = [];
      Object.assign(window, { shown });
      const watch = () => {
        panels.forEach((p, i) => {
          if (shown[i] === undefined && Number(getComputedStyle(p).opacity) > 0)
            shown[i] = performance.now();
        });
        if (shown.filter((t) => t !== undefined).length < panels.length)
          requestAnimationFrame(watch);
      };
      watch();
    }, titles);
    await panel(page, titles[4]).scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 400);

    await expect(panel(page, titles[4])).toHaveCSS("opacity", "1");
    const shown = await page.evaluate(() => (window as unknown as { shown: number[] }).shown);
    // The bottom row: left to right, each a beat (140 ms) after the one before.
    expect(shown[3]! - shown[2]!).toBeGreaterThan(100);
    expect(shown[4]! - shown[3]!).toBeGreaterThan(100);
  });

  test("a picture plays while the pointer is on its panel, and rests when it leaves", async ({
    page,
  }) => {
    await page.goto("/");
    await panel(page, "Product context, built in").scrollIntoViewIfNeeded();
    await expect(live(page)).toHaveCSS("opacity", "0");

    await panel(page, "Product context, built in").hover();
    await expect(live(page)).toHaveCSS("opacity", "1");

    await page.mouse.move(0, 0);
    await expect(live(page)).toHaveCSS("opacity", "0");
  });

  test("a panel reached with the keyboard plays as it does under the pointer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Try the demo" }).focus();
    for (const title of titles.slice(0, 4)) {
      await page.keyboard.press("Tab");
      await expect(panel(page, title)).toBeFocused();
    }
    await expect(live(page)).toHaveCSS("opacity", "1");

    await page.keyboard.press("Tab");
    await expect(live(page)).toHaveCSS("opacity", "0");
  });

  test("with reduced motion every panel is already in place", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    for (const title of titles) await expect(panel(page, title)).toHaveCSS("opacity", "1");
  });

  test("on a phone the duo card keeps its tree, both readings side by side", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const duo = panel(page, "Uno map, duo users");
    await duo.scrollIntoViewIfNeeded();
    await expect(duo).toHaveCSS("transform", "none");

    const data = duo.locator("pre");
    const reading = data.locator("xpath=../preceding-sibling::div/div");
    const [left, right] = [await reading.boundingBox(), await data.boundingBox()];
    expect(left!.y).toBe(right!.y);
    expect(left!.x + left!.width).toBeLessThanOrEqual(right!.x);

    // The data reading folds its last line to fit.
    await expect(data.getByText("…")).toBeVisible();
    await expect(data.getByText('"leads_to"')).toBeHidden();
  });
});

test.describe("bento on a touch screen", () => {
  // A phone: a touch screen with no hover.
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test("a picture plays in the middle of the screen, rests, and plays again", async ({ page }) => {
    await page.goto("/");
    const context = panel(page, "Product context, built in");
    await context.evaluate((p) => p.scrollIntoView({ block: "center" }));

    await expect(live(page)).toHaveCSS("opacity", "1");
    await expect(live(page)).toHaveCSS("opacity", "0", { timeout: 6000 });
    await expect(live(page)).toHaveCSS("opacity", "1", { timeout: 3000 });

    // Scrolled away, it stops.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(live(page)).toHaveCSS("opacity", "0");
  });
});
