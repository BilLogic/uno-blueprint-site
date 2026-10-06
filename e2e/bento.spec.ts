import { devices, expect, test, type Page } from "@playwright/test";
import { bento } from "@/content/bento";
import { ARRIVAL_STEP_MS, PLAY_MS, REST_MS } from "@/lib/bento";
import { FRAME, flushRenders, installClock, runUntil, stopClockASecondOn } from "./clock";


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
    // The page's clock stands still and is stepped by hand, so each beat is
    // measured exactly rather than by how fast a busy machine draws frames.
    await page.clock.install({ time: new Date("2026-01-01T09:00:00Z") });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.clock.pauseAt(new Date("2026-01-01T09:01:00Z"));
    for (const title of titles) await expect(panel(page, title)).toHaveCSS("opacity", "0");

    /** Scroll until the panel's top edge sits `y` pixels down the screen. */
    const bringTo = (title: (typeof titles)[number], y: number) =>
      panel(page, title).evaluate((p, y) => {
        window.scrollTo({ top: p.getBoundingClientRect().top + window.scrollY - y, behavior: "instant" });
      }, y);
    const arrived = (title: (typeof titles)[number]) =>
      expect(panel(page, title)).toHaveAttribute("data-arrived");
    const waiting = async (title: (typeof titles)[number]) => {
      await flushRenders(page);
      await expect(panel(page, title)).not.toHaveAttribute("data-arrived");
    };

    /** The row's first panel arrives at once; each after it exactly a beat later, left to right. */
    const arriveOneBeatApart = async (row: (typeof titles)[number][]) => {
      // The first panel lands as soon as the row is seen, without the clock moving on.
      await expect
        .poll(async () => {
          await page.clock.runFor(0);
          return panel(page, row[0]!).getAttribute("data-arrived");
        })
        .not.toBeNull();
      for (const title of row.slice(1)) {
        await waiting(title);
        await page.clock.runFor(ARRIVAL_STEP_MS - 1);
        await waiting(title);
        await page.clock.runFor(1);
        await arrived(title);
      }
    };

    // The top row comes into view; the bottom row, still below the line, waits unseen.
    await bringTo(titles[0], 450);
    await arriveOneBeatApart([titles[0], titles[1]]);
    await page.clock.runFor(2000);
    for (const title of titles.slice(2)) {
      await waiting(title);
      await expect(panel(page, title)).toHaveCSS("opacity", "0");
    }

    // Scrolled on, the bottom row arrives in turn.
    await bringTo(titles[2], 300);
    await arriveOneBeatApart([titles[2], titles[3], titles[4]]);
    for (const title of titles) await expect(panel(page, title)).toHaveCSS("opacity", "1");
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
    // Typed a letter to an element, it still reads as one question.
    const question = rag.getByRole("img");
    await expect(question).toHaveCount(1);
    await expect(question).toHaveAccessibleName(bento.rag.question);

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

  test("the keyboard stops once on each panel and nowhere inside one", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Try the demo" }).first().focus();
    const stops: string[] = [];
    // Tab on until focus leaves the bento, noting each panel it stops on.
    for (;;) {
      await page.keyboard.press("Tab");
      const name = await page.evaluate(() => {
        const focused = document.activeElement;
        const group = focused?.closest('[role="group"][aria-labelledby]');
        if (!group?.querySelector("h3")) return null;
        return focused === group ? group.querySelector("h3")!.textContent : `inside ${group.querySelector("h3")!.textContent}`;
      });
      if (name === null) break;
      stops.push(name);
    }
    expect(stops).toEqual([...titles]);
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
    // The page's clock stands still and is stepped by hand, so the play and the rest are timed exactly.
    await installClock(page);
    await page.goto("/");
    await stopClockASecondOn(page);
    const context = panel(page, bento.context.title);
    await context.evaluate((p) => p.scrollIntoView({ block: "center" }));

    // It starts playing on the next frame; from then on, each step lands within that frame of its time.
    const playing = () => context.evaluate((p) => p.getAttribute("data-playing") === "true");
    await runUntil(page, playing, { step: FRAME, limit: 1000 });
    const still = async (on: boolean) => {
      await flushRenders(page);
      expect(await playing()).toBe(on);
    };
    await page.clock.runFor(PLAY_MS - FRAME - 1);
    await still(true);
    await page.clock.runFor(FRAME + 1);
    await still(false);
    await page.clock.runFor(REST_MS - FRAME - 1);
    await still(false);
    await page.clock.runFor(FRAME + 1);
    await still(true);

    // Scrolled away, it stops.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(context).not.toHaveAttribute("data-playing");
  });
});
