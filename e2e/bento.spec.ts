import { devices, expect, test, type Page } from "@playwright/test";
import { bento } from "@/content/bento";

const titles = [
  bento.duo.title,
  bento.rag.title,
  bento.scale.title,
  bento.context.title,
  bento.sources.title,
] as const;

const panel = (page: Page, title: (typeof titles)[number]) =>
  page.getByRole("group", { name: title });

/**
 * The product-context picture's status reads "Planned" at rest and "Live" while
 * it plays, rolling in one letter at a time: this is Live's last letter.
 */
const live = (page: Page) =>
  panel(page, bento.context.title).getByText("Live", { exact: true }).locator("i").last();

/** The RAG picture's question, typed in while it plays: its last letter. */
const typed = (page: Page) =>
  panel(page, bento.rag.title).getByText(bento.rag.question, { exact: true }).locator("i").last();

test.describe("bento", () => {
  test("panels arrive as they scroll into view, one beat apart along a row", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(panel(page, titles[0])).toHaveCSS("opacity", "0");

    // Note when each panel first shows, frame by frame, while the reader scrolls down.
    const panels = await Promise.all(titles.map((title) => panel(page, title).elementHandle()));
    await page.evaluate((panels) => {
      const shown: number[] = [];
      Object.assign(window, { shown });
      const watch = () => {
        panels.forEach((p, i) => {
          if (shown[i] === undefined && Number(getComputedStyle(p!).opacity) > 0)
            shown[i] = performance.now();
        });
        if (shown.filter((t) => t !== undefined).length < panels.length)
          requestAnimationFrame(watch);
      };
      watch();
    }, panels);
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
    await panel(page, bento.context.title).scrollIntoViewIfNeeded();
    await expect(live(page)).toHaveCSS("opacity", "0");

    await panel(page, bento.context.title).hover();
    await expect(live(page)).toHaveCSS("opacity", "1");

    await page.mouse.move(0, 0);
    await expect(live(page)).toHaveCSS("opacity", "0");
  });

  test("the RAG question types itself out while the pointer is on its panel, unquoted", async ({ page }) => {
    await page.goto("/");
    const rag = panel(page, bento.rag.title);
    await rag.scrollIntoViewIfNeeded();
    await expect(typed(page)).toHaveCSS("opacity", "0");

    await rag.hover();
    await expect(typed(page)).toHaveCSS("opacity", "1");
    await expect(rag).not.toContainText("“");

    await page.mouse.move(0, 0);
    await expect(typed(page)).toHaveCSS("opacity", "0");
  });

  test("a panel reached with the keyboard plays as it does under the pointer", async ({ page }) => {
    await page.goto("/");
    // The hero's link, the last stop before the bento.
    await page.getByRole("link", { name: "Try the demo" }).first().focus();
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

    // A picture shows how it ends at once, with nothing in between.
    await panel(page, bento.context.title).hover();
    await expect(live(page)).toHaveCSS("opacity", "1", { timeout: 100 });

    // The RAG question is already typed, at rest.
    await expect(typed(page)).toHaveCSS("opacity", "1");
  });

  test("on a phone the duo card keeps its tree, both readings side by side", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Reduced motion: the panel is in place, not still rising.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const duo = panel(page, bento.duo.title);
    await duo.scrollIntoViewIfNeeded();
    await expect(duo).toBeInViewport();

    // The data reading sits in the right half, beside the page reading rather than under it.
    const [card, data] = [await duo.boundingBox(), await duo.getByText('"lane"').boundingBox()];
    expect(data!.x).toBeGreaterThan(card!.x + card!.width / 2);

    // The data reading folds its last line to fit.
    await expect(duo.getByText("…")).toBeVisible();
    await expect(duo.getByText('"leads_to"')).toBeHidden();
  });
});

test.describe("bento without script", () => {
  test.use({ javaScriptEnabled: false });

  test("every panel is there", async ({ page }) => {
    await page.goto("/");
    for (const title of titles) await expect(panel(page, title)).toHaveCSS("opacity", "1");
  });
});

test.describe("bento on a touch screen", () => {
  // A phone: a touch screen with no hover.
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test("a picture plays in the middle of the screen, rests, and plays again", async ({ page }) => {
    await page.goto("/");
    const context = panel(page, bento.context.title);
    await context.evaluate((p) => p.scrollIntoView({ block: "center" }));

    await expect(live(page)).toHaveCSS("opacity", "1");
    await expect(live(page)).toHaveCSS("opacity", "0", { timeout: 6000 });
    await expect(live(page)).toHaveCSS("opacity", "1", { timeout: 3000 });

    // Scrolled away, it stops.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(live(page)).toHaveCSS("opacity", "0");
  });
});
