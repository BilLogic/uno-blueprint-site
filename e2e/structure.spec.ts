import { expect, test, type Page } from "@playwright/test";
import { structure } from "../content/structure";
import { TIMING } from "../lib/walkthrough";
import { scrollToStep } from "./walkthrough-scroll";

const heading = `${structure.heading.lead} ${structure.heading.main}`;
const titles = structure.steps.map((step) => step.title);

/** How early, or late, the cell may open against its beat, in ms: a frame or two early, a busy frame or so late. */
const BEAT_EARLY = 100;
const BEAT_LATE = 300;
/** Long enough for the cell to light and open after the step shows. */
const OPEN_TIMEOUT = 5000;
/** The stage's classes for a lit cell and an open panel (CSS module names end in the local name). */
const LIT_CLASS = /cellPicked$/;
const OPEN_CLASS = /(^|__)open$/;
/** A move of the page smaller than this, in px, is rounding, not the page being held back. */
const HELD_SLACK = 1;

/** Long enough for the morph and every step's hold, one at a time, with room to spare. */
const WALK_TIMEOUT = 30_000;

const section = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: heading }) });

const caption = (page: Page) => section(page).locator("[aria-live] b");

const nextFrame = (page: Page) =>
  page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

/**
 * Notes every caption title the walkthrough shows from now on, in order, and
 * every frame where a context card jumps further than a frame of its morph
 * could take it.
 */
async function watch(page: Page) {
  await caption(page).waitFor();
  await page.evaluate(() => {
    const w = window as unknown as { seen: string[]; jumps: number };
    const live = document.querySelector("section [aria-live]")!;
    w.seen = [live.querySelector("b")!.textContent!];
    w.jumps = 0;
    new MutationObserver(() => {
      const title = live.querySelector("b")?.textContent;
      if (title && w.seen.at(-1) !== title) w.seen.push(title);
    }).observe(live, { childList: true, subtree: true, characterData: true });
    const cards = [...document.querySelectorAll<HTMLElement>("[data-card]")];
    let last = cards.map((card) => card.getBoundingClientRect());
    const sample = () => {
      const now = cards.map((card) => card.getBoundingClientRect());
      // A card moves at most this far in a frame while it morphs; a snap would be the whole way.
      if (now.some((rect, i) => Math.hypot(rect.x - last[i]!.x, rect.y - last[i]!.y) > 120)) w.jumps++;
      last = now;
      requestAnimationFrame(sample);
    };
    addEventListener("scroll", () => (last = cards.map((card) => card.getBoundingClientRect())), { passive: true });
    requestAnimationFrame(sample);
  });
}

const seen = (page: Page) => page.evaluate(() => (window as unknown as { seen: string[] }).seen);
const jumps = (page: Page) => page.evaluate(() => (window as unknown as { jumps: number }).jumps);

/** The walkthrough's scroll range on the page, in px. */
async function range(page: Page) {
  const box = await section(page).boundingBox();
  if (!box) throw new Error("the structure section is not on the page");
  const top = await page.evaluate((y) => y + window.scrollY, box.y);
  return { top, end: top + box.height };
}

/**
 * Wheels from above the section to past its end, `delta` px a notch, a notch
 * every `every` ms. Returns how far the wheels asked the page to move, how far
 * it moved, and how many times it was carried back up on the way.
 */
async function wheelThrough(page: Page, delta: number, every: number) {
  const { top, end } = await range(page);
  const from = top - 300;
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), from);
  await page.evaluate((slack) => {
    const w = window as unknown as { backs: number };
    w.backs = 0;
    let last = scrollY;
    addEventListener(
      "scroll",
      () => {
        if (scrollY < last - slack) w.backs++;
        last = scrollY;
      },
      { passive: true },
    );
  }, HELD_SLACK);
  await page.mouse.move(400, 400);
  let asked = 0;
  for (let y = from; y < end; y += delta) {
    await page.mouse.wheel(0, delta);
    asked += delta;
    await page.waitForTimeout(every);
  }
  // Let the last notch land before measuring.
  await nextFrame(page);
  const { moved, backs } = await page.evaluate(
    (start) => ({ moved: scrollY - start, backs: (window as unknown as { backs: number }).backs }),
    from,
  );
  return { asked, moved, backs };
}

/** Whether the stage shows the cell lit, and whether its panel is open, as `[lit, open]`. */
const cellState = (page: Page) =>
  section(page)
    .locator("[data-board]")
    .evaluate(
      (board, [lit, open]) => {
        const classes = [...board.closest("[aria-hidden]")!.classList];
        return [classes.some((c) => new RegExp(lit!).test(c)), classes.some((c) => new RegExp(open!).test(c))];
      },
      [LIT_CLASS.source, OPEN_CLASS.source],
    );

/** Waits until the walkthrough has caught up with the scroll and shows `title`. */
const settlesOn = (page: Page, title: string) =>
  expect(caption(page)).toHaveText(title, { timeout: WALK_TIMEOUT });

test.describe("structure walkthrough", () => {
  test.describe.configure({ timeout: 90_000 });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    for (const [speed, delta, every] of [
      ["slowly", 60, 60],
      ["at a normal pace", 120, 30],
      ["fast", 400, 16],
    ] as const) {
      test(`at ${viewport.width} px wheeling down ${speed} shows every step in order and leaves the section with no hold`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto("/");
        await watch(page);
        const { asked, moved, backs } = await wheelThrough(page, delta, every);
        // Nothing holds the page: every notch moves it, and it is never carried back.
        expect(backs).toBe(0);
        expect(moved).toBeGreaterThanOrEqual(asked - HELD_SLACK);
        await settlesOn(page, titles.at(-1)!);
        expect(await seen(page)).toEqual(titles);
        expect(await jumps(page)).toBe(0);
      });
    }
  }

  test("arriving at Cells, the cell lights first and opens about a beat later; scrolling up closes it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const steps = titles.indexOf("Steps");
    await scrollToStep(section(page), steps, 0.5);
    await settlesOn(page, "Steps");
    expect(await cellState(page)).toEqual([false, false]);
    // Note when the cell lights, and when it opens.
    await section(page)
      .locator("[data-board]")
      .evaluate(
        (board, [lit, open]) => {
          const stage = board.closest("[aria-hidden]")!;
          const w = window as unknown as { lit?: number; opened?: number };
          const has = (pattern: string) => [...stage.classList].some((c) => new RegExp(pattern).test(c));
          const check = () => {
            if (w.lit === undefined && has(lit!)) w.lit = performance.now();
            if (w.opened === undefined && has(open!)) w.opened = performance.now();
            requestAnimationFrame(check);
          };
          requestAnimationFrame(check);
        },
        [LIT_CLASS.source, OPEN_CLASS.source],
      );
    await scrollToStep(section(page), titles.indexOf("Cells"), 0.5);
    await settlesOn(page, "Cells");
    await expect.poll(() => cellState(page), { timeout: OPEN_TIMEOUT }).toEqual([true, true]);
    const { lit, opened } = await page.evaluate(() => {
      const w = window as unknown as { lit: number; opened: number };
      return { lit: w.lit, opened: w.opened };
    });
    expect(opened - lit).toBeGreaterThan(TIMING.cellBeat - BEAT_EARLY);
    expect(opened - lit).toBeLessThan(TIMING.cellBeat + BEAT_LATE);

    // Back up: the panel closes at once, with the step.
    await scrollToStep(section(page), steps, 0.5);
    await settlesOn(page, "Steps");
    expect(await cellState(page)).toEqual([false, false]);
  });

  test("the stage clips its sides and top only, so the open cell's shadow is not cut at its foot", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const stage = section(page).locator("[data-board]").locator("xpath=ancestor::*[@aria-hidden][1]");
    const style = await stage.evaluate((el) => {
      const computed = getComputedStyle(el);
      const foot = getComputedStyle(document.documentElement).getPropertyValue("--spacing-stage-foot").trim();
      return { overflow: computed.overflow, clipPath: computed.clipPath, foot };
    });
    expect(style.overflow).toBe("visible");
    expect(style.foot).toMatch(/^\d+px$/);
    expect(style.clipPath).toBe(`inset(0px 0px -${style.foot})`);
  });

  test("on a phone the walkthrough reads the same steps, with nothing wider than the screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await watch(page);
    const { top, end } = await range(page);
    let overflow = 0;
    for (let y = top - 200; y < end; y += 160) {
      await page.evaluate((to) => window.scrollTo(0, to), y);
      await nextFrame(page);
      overflow = Math.max(
        overflow,
        await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      );
    }
    await settlesOn(page, titles.at(-1)!);
    expect(await seen(page)).toEqual(titles);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("a jump to the end still walks through every step", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await watch(page);
    const { end } = await range(page);
    await page.evaluate((y) => window.scrollTo(0, y), end - 1000);
    await settlesOn(page, titles.at(-1)!);
    expect(await seen(page)).toEqual(titles);
  });

  test("the cards become the stack on their own past the buffer, and play back above it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await watch(page);
    const firstCard = section(page).locator("[data-card]").first();
    // Pinned, but only a fifth of the way into the opening step: the cards stay put.
    await scrollToStep(section(page), 0, 0.2);
    await page.waitForTimeout(600);
    await expect(firstCard).not.toHaveAttribute("style", /rotateX/);
    await expect(caption(page)).toHaveText(titles[0]!);

    // Past the buffer: the morph starts and runs with no more scrolling, then hands on to Services.
    await scrollToStep(section(page), 0, 0.6);
    await expect(firstCard).toHaveAttribute("style", /rotateX/);
    await expect(caption(page)).toHaveText(titles[0]!);
    await settlesOn(page, titles[1]!);

    // Back above the buffer: the opening step returns and the cards play back to rest.
    await scrollToStep(section(page), 0, 0.2);
    await settlesOn(page, titles[0]!);
    await expect(firstCard).not.toHaveAttribute("style", /rotateX/, { timeout: 5000 });
  });

  test("a fast scroll back up plays the cards back only once the opening step shows again", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await watch(page);
    await scrollToStep(section(page), 3);
    await settlesOn(page, titles[3]!);
    // While any later step shows, the cards must stay as the stack they became.
    await page.evaluate(() => {
      const w = window as unknown as { early: number };
      w.early = 0;
      const card = document.querySelector<HTMLElement>("[data-card]")!;
      const formed = card.style.left;
      const check = () => {
        const title = document.querySelector("section [aria-live] b")?.textContent;
        if (title !== "Your context" && card.style.left !== formed) w.early++;
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
    await scrollToStep(section(page), 0, 0.1);
    await settlesOn(page, titles[0]!);
    await expect(section(page).locator("[data-card]").first()).not.toHaveAttribute("style", /rotateX/, {
      timeout: 5000,
    });
    expect(await page.evaluate(() => (window as unknown as { early: number }).early)).toBe(0);
    expect(await seen(page)).toEqual([...titles.slice(0, 4), ...titles.slice(0, 3).reverse()]);
  });

  test("with reduced motion the last step shows at once and the section does not pin", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const live = section(page).locator("[aria-live]");
    await expect(live.locator("b")).toHaveText(titles.at(-1)!);
    await expect(live.locator("p")).toHaveText(structure.steps.at(-1)!.caption);
    const box = await section(page).boundingBox();
    expect(box!.height).toBeLessThan(2 * 900);
  });

  for (const width of [1440, 390]) {
    test(`at ${width} px the flat board sits as far below the frame's top as above the caption`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await scrollToStep(section(page), titles.indexOf("Blueprint"));
      await settlesOn(page, "Blueprint");
      // Let the board finish turning to face the reader.
      await page.waitForTimeout(2500);
      // The board is drawn with the two paths behind it peeking out above, so the three are measured together.
      const gaps = await section(page).evaluate((el) => {
        const boards = [...el.querySelectorAll("[data-board], [data-ghost]")].map((b) => b.getBoundingClientRect());
        const stage = el.querySelector("[data-board]")!.closest("[aria-hidden]")!.getBoundingClientRect();
        const captionText = el.querySelector("[aria-live] b")!.getBoundingClientRect();
        const top = Math.min(...boards.map((b) => b.top));
        const bottom = Math.max(...boards.map((b) => b.bottom));
        return { above: top - stage.top, below: captionText.top - bottom };
      });
      expect(Math.abs(gaps.above - gaps.below)).toBeLessThanOrEqual(2);
    });
  }
});
