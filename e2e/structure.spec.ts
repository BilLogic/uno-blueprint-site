import { expect, test, type Page } from "@playwright/test";
import { structure } from "../content/structure";
import { TIMING, stepAt, stepEdges } from "../lib/walkthrough";
import { scrollToStep } from "./walkthrough-scroll";

const heading = `${structure.heading.lead} ${structure.heading.main}`;
const titles = structure.steps.map((step) => step.title);
const edges = stepEdges(structure.steps.map((step) => step.scroll));

/** A hard flick: this many wheel notches of this many px, a frame apart. */
const FLICK_NOTCHES = 10;
const FLICK_NOTCH = 300;
const NOTCH_EVERY = 16;
/** After a flick, long enough for the page to come to rest and the gesture to end. */
const FLICK_REST = 400;
const FLICK_SETTLE = TIMING.gateIdle + FLICK_REST;
/** Fifteen flicks and their settling, with room to spare. */
const FLICK_WALK_TIMEOUT = 120_000;
/** How far the progress may sit from the end once held there, in decimal places, and how far past it a free flick lands. */
const HELD_AT_END_PLACES = 2;
const LEFT_THE_SECTION = 1.05;
/** How early, or late, the cell may open against its beat, in ms: a frame or two early, a busy frame or so late. */
const BEAT_EARLY = 100;
const BEAT_LATE = 300;
/** Long enough for the cell to light and open after the step shows. */
const OPEN_TIMEOUT = 5000;
/** The stage's classes for a lit cell and an open panel (CSS module names end in the local name). */
const LIT_CLASS = /cellPicked$/;
const OPEN_CLASS = /(^|__)open$/;

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

/** The pinned scroll on the page: where it starts and how far it runs, in px. */
const pinnedScroll = (page: Page) =>
  section(page).evaluate((el) => {
    const pinned = [...el.querySelectorAll<HTMLElement>("*")].find((n) => getComputedStyle(n).position === "sticky")!;
    const scroller = pinned.parentElement!;
    const start = scroller.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(pinned).top);
    return { start, travel: scroller.offsetHeight - pinned.offsetHeight, y: scrollY };
  });

/** How far through the pinned scroll the page is: below 0 above it, above 1 past it. */
async function progress(page: Page) {
  const { start, travel, y } = await pinnedScroll(page);
  return (y - start) / travel;
}

/** One hard wheel flick, down (`direction` 1) or up (-1), then a wait until the page is still. */
async function flick(page: Page, direction: 1 | -1 = 1) {
  const size = page.viewportSize()!;
  await page.mouse.move(size.width / 2, size.height / 2);
  for (let i = 0; i < FLICK_NOTCHES; i++) {
    await page.mouse.wheel(0, direction * FLICK_NOTCH);
    await page.waitForTimeout(NOTCH_EVERY);
  }
  await page.waitForTimeout(FLICK_SETTLE);
}

/** A trackpad swipe: its deltas rise through these, then decay from the peak by a factor an event until under a pixel. */
const SWIPE_RISE = [10, 22, 34, 46, 58, 70];
const SWIPE_PEAK = 80;
const SWIPE_DECAY = 0.93;
const SWIPE_END = 1;

/** One trackpad-like swipe down: speeding up, then coasting to a stop, an event every frame, with no pause after it. */
async function swipe(page: Page) {
  const size = page.viewportSize()!;
  await page.mouse.move(size.width / 2, size.height / 2);
  const deltas = [...SWIPE_RISE];
  for (let delta = SWIPE_PEAK; delta >= SWIPE_END; delta *= SWIPE_DECAY) deltas.push(delta);
  for (const delta of deltas) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(NOTCH_EVERY);
  }
}

/** A harder flick for the shake test: many smaller notches, so several land on the stop. */
const HARD_NOTCHES = 30;
const HARD_NOTCH = 120;

/** A hard flick down, with no pause after it. */
async function hardFlick(page: Page) {
  const size = page.viewportSize()!;
  await page.mouse.move(size.width / 2, size.height / 2);
  for (let i = 0; i < HARD_NOTCHES; i++) {
    await page.mouse.wheel(0, HARD_NOTCH);
    await page.waitForTimeout(NOTCH_EVERY);
  }
}

/** Where on Cells a gesture into the stop after it starts: where the gesture before it rests. */
const CELLS_REST = 0.15;
/** A move of the section smaller than this, in px, is rounding, not a reversal. */
const REVERSAL_SLACK = 1;

/** Samples the section's bottom edge every frame from now on. */
const sampleBottom = (page: Page) =>
  section(page).evaluate((el) => {
    const w = window as unknown as { bottoms: number[] };
    w.bottoms = [];
    const sample = () => {
      w.bottoms.push(el.getBoundingClientRect().bottom);
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

/** How many times the sampled section turned back by more than `REVERSAL_SLACK`. */
async function reversals(page: Page) {
  const bottoms = await page.evaluate(() => (window as unknown as { bottoms: number[] }).bottoms);
  let heading = 0;
  let count = 0;
  for (let i = 1; i < bottoms.length; i++) {
    const move = bottoms[i]! - bottoms[i - 1]!;
    if (Math.abs(move) <= REVERSAL_SLACK) continue;
    const sign = Math.sign(move);
    if (heading && sign !== heading) count++;
    heading = sign;
  }
  return count;
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
    test(`at ${viewport.width} px each hard flick down moves exactly one step, and the one after Cells holds, then leaves`, async ({
      page,
    }) => {
      test.setTimeout(FLICK_WALK_TIMEOUT);
      await page.setViewportSize(viewport);
      await page.goto("/");
      await watch(page);
      await scrollToStep(section(page), 0, 0.1);
      await nextFrame(page);
      for (let step = 1; step < titles.length; step++) {
        await flick(page);
        expect(stepAt(await progress(page), edges), `flick ${step}`).toBe(step);
      }
      // The flick after Cells holds where the walkthrough lets go.
      await flick(page);
      expect(await progress(page)).toBeCloseTo(1, HELD_AT_END_PLACES);
      await settlesOn(page, titles.at(-1)!);
      expect(await seen(page)).toEqual(titles);
      expect(await jumps(page)).toBe(0);
      // The flick after that is free, and leaves the section.
      await flick(page);
      expect(await progress(page)).toBeGreaterThan(LEFT_THE_SECTION);
    });
  }

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`at ${viewport.width} px back-to-back trackpad swipes move one step each, and the one after Cells holds, then leaves`, async ({
      page,
    }) => {
      test.setTimeout(FLICK_WALK_TIMEOUT);
      await page.setViewportSize(viewport);
      await page.goto("/");
      await watch(page);
      await scrollToStep(section(page), 0, 0.1);
      await nextFrame(page);
      const reached: number[] = [];
      for (let step = 1; step < titles.length; step++) {
        await swipe(page);
        reached.push(stepAt(await progress(page), edges));
      }
      expect(reached).toEqual(titles.slice(1).map((_, i) => i + 1));
      // The swipe after Cells holds where the walkthrough lets go; the one after that leaves.
      await swipe(page);
      expect(await progress(page)).toBeCloseTo(1, HELD_AT_END_PLACES);
      await swipe(page);
      expect(await progress(page)).toBeGreaterThan(LEFT_THE_SECTION);
      await settlesOn(page, titles.at(-1)!);
      expect(await seen(page)).toEqual(titles);
    });
  }

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    for (const [name, gesture] of [
      ["a trackpad swipe", swipe],
      ["a hard flick", hardFlick],
    ] as const) {
      test(`at ${viewport.width} px ${name} into the stop after Cells never moves the page back`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto("/");
        await scrollToStep(section(page), titles.length - 1, CELLS_REST);
        await settlesOn(page, titles.at(-1)!);
        await page.waitForTimeout(FLICK_SETTLE);
        await sampleBottom(page);
        await gesture(page);
        await page.waitForTimeout(FLICK_SETTLE);
        expect(await progress(page)).toBeCloseTo(1, HELD_AT_END_PLACES);
        expect(await reversals(page)).toBe(0);
      });
    }
  }

  test("one hard flick up goes back several steps", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await scrollToStep(section(page), titles.length - 1, 0.5);
    await settlesOn(page, titles.at(-1)!);
    await flick(page, -1);
    expect(stepAt(await progress(page), edges)).toBeLessThan(titles.length - 3);
  });

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
    await flick(page);
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
