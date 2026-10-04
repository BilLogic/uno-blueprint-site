import { expect, test, type Page } from "@playwright/test";
import { structure } from "../content/structure";
import { scrollToStep } from "./walkthrough-scroll";

const heading = `${structure.heading.lead} ${structure.heading.main}`;
const titles = structure.steps.map((step) => step.title);

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

/** Wheels from above the section to past its end, `delta` px a notch, a notch every `every` ms. */
async function wheelThrough(page: Page, delta: number, every: number) {
  const { top, end } = await range(page);
  await page.evaluate((y) => window.scrollTo(0, y), top - 300);
  await page.mouse.move(400, 400);
  for (let y = top - 300; y < end; y += delta) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(every);
  }
}

/** Waits until the walkthrough has caught up with the scroll and shows `title`. */
const settlesOn = (page: Page, title: string) =>
  expect(caption(page)).toHaveText(title, { timeout: WALK_TIMEOUT });

test.describe("structure walkthrough", () => {
  test.describe.configure({ timeout: 90_000 });

  for (const [speed, delta, every] of [
    ["slowly", 60, 60],
    ["at a normal pace", 120, 30],
    ["fast", 400, 16],
  ] as const) {
    test(`wheeling down ${speed} shows every step in order, with no card jumping`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      await watch(page);
      await wheelThrough(page, delta, every);
      await settlesOn(page, titles.at(-1)!);
      expect(await seen(page)).toEqual(titles);
      expect(await jumps(page)).toBe(0);
    });
  }

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
