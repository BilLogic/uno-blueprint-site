import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { structure } from "../content/structure";
import { getStarted } from "../content/get-started";
import { cssMs } from "../lib/hero-picture";
import { TIMING, cellArrival } from "../lib/walkthrough";
import { exitScroll, scrollToStep } from "./walkthrough-scroll";

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
/** A move of the page smaller than this, in px, is rounding, not the page being held or carried back. */
const ROUNDING_SLACK = 1;
/** How far above the section the wheeling starts, in px. */
const LEAD_IN = 300;
/** How early, or late, a hold capped by time may let go against its cap, in ms: a frame early, a busy frame or two late. */
const HOLD_EARLY = 100;
/** Generous, as the clocks are read across a wheel loop driven from the test runner, which a busy machine slows. */
const HOLD_LATE = 600;
/** An input event is handled this long after the browser stamps it, in ms, at most, on a busy machine. */
const EVENT_SLACK = 100;
/** How long the reader keeps on going down after the planned notches, to get past a hold at the end. */
const KEEP_GOING_MS = 6000;
/** A fast wheel at the end: a big notch every frame. */
const FAST_NOTCH = 400;
const FAST_EVERY = 16;
/** A swipe up a phone's screen, in px: where the finger lands, where it lifts, and each move between. */
const SWIPE_X = 195;
const SWIPE_FROM = 640;
const SWIPE_TO = 340;
const SWIPE_STEP = 30;
/** How far past the exit the swipes carry on, to show the page goes on after the hold, in px. */
const SWIPE_PAST = 400;
/** A continuous gesture, as a trackpad or a finger sends it: how fast it scrolls, in px a second, how far past the exit the first runs on, and how far each after it goes, in px. */
const GESTURE_SPEED = 3000;
const GESTURE_PAST = 1200;
const GESTURE_STEP = 400;

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

type Notes = {
  /** Times the page was carried back up. */
  backs: number;
  /** Where the page was once each move down the page held had been handled, and when it came. */
  held: { y: number; at: number; touch: boolean }[];
  /** Wheels and touch moves down the page that the browser would not let be stopped. */
  unstoppable: number;
  /** When the page first came to the exit. */
  reachedAt?: number;
  /** When the caption turned to the last step, the cell's panel opened, and the page first went past the exit. */
  cellsAt?: number;
  openEndAt?: number;
  leftAt?: number;
};

/**
 * Notes, from now on, every time the page is carried back up, every wheel,
 * scrolling key or touch move down that the page held (stopped before it
 * moved) and every one it could not have, when the last step shows and when
 * its panel has finished opening (the panel's clip has run), and when the
 * page first comes to `exit`, where the walkthrough lets go, and first goes
 * past it.
 */
async function note(page: Page, exit: number) {
  await page.evaluate(
    ([slack, exitY, lastTitle]) => {
      const w = window as unknown as { notes: Notes };
      const notes: Notes = { backs: 0, held: [], unstoppable: 0 };
      w.notes = notes;
      let last = scrollY;
      addEventListener(
        "scroll",
        () => {
          if (scrollY < last - slack) notes.backs++;
          last = scrollY;
          if (notes.reachedAt === undefined && Math.abs(scrollY - exitY) <= slack) notes.reachedAt = performance.now();
          if (notes.leftAt === undefined && scrollY > exitY + slack) notes.leftAt = performance.now();
        },
        { passive: true },
      );
      // Checked once the page's own listeners have had the event.
      const heldDown = (event: Event, down: boolean) => {
        const at = performance.now();
        if (down && !event.cancelable) notes.unstoppable++;
        setTimeout(() => {
          if (down && event.defaultPrevented) notes.held.push({ y: scrollY, at, touch: event.type === "touchmove" });
        });
      };
      addEventListener("wheel", (e) => heldDown(e, e.deltaY > 0), { passive: true });
      addEventListener("keydown", (e) => heldDown(e, ["PageDown", "ArrowDown", " "].includes(e.key) && !e.shiftKey));
      addEventListener("touchmove", (e) => heldDown(e, true), { passive: true });
      const live = document.querySelector("section [aria-live]")!;
      new MutationObserver(() => {
        if (notes.cellsAt === undefined && live.querySelector("b")?.textContent === lastTitle) notes.cellsAt = performance.now();
      }).observe(live, { childList: true, subtree: true, characterData: true });
      document.querySelector("[data-panel]")!.addEventListener("transitionend", (event) => {
        const { propertyName } = event as TransitionEvent;
        if (propertyName === "clip-path" && notes.cellsAt !== undefined && notes.openEndAt === undefined) notes.openEndAt = performance.now();
      });
    },
    [ROUNDING_SLACK, exit, titles.at(-1)!] as const,
  );
}

/** The longest a hold lasts: the cell's arrival, with the panel's times read from their tokens. */
const holdCap = async (page: Page) => {
  const [panelDelay, panelOpen] = await page.evaluate(() =>
    ["--duration-panel-delay", "--duration-leave"].map((name) => getComputedStyle(document.documentElement).getPropertyValue(name)),
  );
  return cellArrival({ cellBeat: TIMING.cellBeat, panelDelay: cssMs(panelDelay!), panelOpen: cssMs(panelOpen!) });
};

const notes = (page: Page) => page.evaluate(() => (window as unknown as { notes: Notes }).notes);
const pageY = (page: Page) => page.evaluate(() => window.scrollY);

/**
 * Wheels down `delta` px a notch, a notch every `every` ms, `count` notches,
 * then keeps on until the page is past `past` (or `KEEP_GOING_MS` is up).
 * Returns how far the wheels asked the page to move and how many notches.
 */
async function wheelDown(page: Page, delta: number, every: number, count: number, past: number) {
  const size = page.viewportSize()!;
  await page.mouse.move(size.width / 2, size.height / 2);
  let asked = 0;
  for (let i = 0; i < count; i++) {
    await page.mouse.wheel(0, delta);
    asked += delta;
    await page.waitForTimeout(every);
  }
  const until = Date.now() + KEEP_GOING_MS;
  while ((await pageY(page)) <= past && Date.now() < until) {
    await page.mouse.wheel(0, delta);
    asked += delta;
    await page.waitForTimeout(every);
  }
  // Let the last notch land before measuring.
  await nextFrame(page);
  return asked;
}

/** Scrolls to the Steps step, waits for it, then to the start of Cells, and notes from there on (see `note`). */
async function arriveAtCells(page: Page) {
  const steps = titles.indexOf("Steps");
  await scrollToStep(section(page), steps, 0.9);
  await settlesOn(page, "Steps");
  const exit = await exitScroll(section(page));
  await note(page, exit);
  await scrollToStep(section(page), titles.indexOf("Cells"), 0.02);
  await settlesOn(page, "Cells");
  return exit;
}

/**
 * Every held move left the page at the exit (a touch, short of it), within
 * the cap of the first, and none came once the panel had opened: a wheel or
 * key that would cross the exit brings the page there and no further.
 */
function expectHeldOnlyAtTheExit(n: Notes, exit: number, cap: number) {
  const first = n.held[0]?.at ?? 0;
  for (const { y, at, touch } of n.held) {
    expect(y).toBeLessThanOrEqual(exit + ROUNDING_SLACK);
    if (!touch) expect(y).toBeGreaterThanOrEqual(exit - ROUNDING_SLACK);
    expect(at - first).toBeLessThan(cap + HOLD_LATE);
    if (n.openEndAt !== undefined) expect(at).toBeLessThan(n.openEndAt + EVENT_SLACK);
  }
}

/**
 * Scrolls `distance` px down the page in one continuous gesture from the
 * middle of the screen, as a trackpad (`mouse`) or a finger (`touch`) sends
 * it, momentum and all; resolves once it has run. A browser lets only a
 * gesture's first wheel or move be stopped, unlike a run of separate wheels.
 */
async function gestureDown(page: Page, cdp: CDPSession, distance: number, source: "mouse" | "touch") {
  const size = page.viewportSize()!;
  await cdp.send("Input.synthesizeScrollGesture", {
    x: size.width / 2,
    y: size.height / 2,
    yDistance: -distance,
    speed: GESTURE_SPEED,
    gestureSourceType: source,
    preventFling: false,
  });
}

/** Scrolls `distance` px up the page in one continuous gesture, as `gestureDown` does down it. */
async function gestureUp(page: Page, cdp: CDPSession, distance: number, source: "mouse" | "touch") {
  await gestureDown(page, cdp, -distance, source);
}

/** From inside the last step, one gesture that runs on past the section, and the page locked at the exit while the cell opens. */
async function lockAtExit(page: Page, source: "mouse" | "touch") {
  const exit = await arriveAtCells(page);
  const cdp = await page.context().newCDPSession(page);
  await gestureDown(page, cdp, exit - (await pageY(page)) + GESTURE_PAST, source);
  await nextFrame(page);
  expect(Math.abs((await pageY(page)) - exit)).toBeLessThanOrEqual(ROUNDING_SLACK);
  return { exit, cdp };
}

/**
 * From inside the last step, one gesture that runs on well past the section:
 * the page stops at the exit, a pixel past it at most, and stays there until
 * the panel has opened or the hold has lasted its cap. Gestures after that go
 * on, and the page is never carried back.
 */
async function expectGestureHeldThenGoesOn(page: Page, source: "mouse" | "touch") {
  const exit = await arriveAtCells(page);
  const cap = await holdCap(page);
  const cdp = await page.context().newCDPSession(page);
  await gestureDown(page, cdp, exit - (await pageY(page)) + GESTURE_PAST, source);
  await nextFrame(page);
  let n = await notes(page);
  // The gesture ran on where it could not be stopped, yet the page waits at the exit while the cell opens.
  expect(n.unstoppable).toBeGreaterThan(0);
  expect(n.reachedAt).toBeDefined();
  expect(n.openEndAt).toBeUndefined();
  expect(Math.abs((await pageY(page)) - exit)).toBeLessThanOrEqual(ROUNDING_SLACK);
  const until = Date.now() + KEEP_GOING_MS;
  while ((await pageY(page)) <= exit + GESTURE_PAST && Date.now() < until) await gestureDown(page, cdp, GESTURE_STEP, source);
  n = await notes(page);
  expect(n.backs).toBe(0);
  const free = Math.min(n.openEndAt ?? Infinity, n.reachedAt! + cap);
  expect(n.leftAt).toBeDefined();
  expect(n.leftAt!).toBeGreaterThan(free - HOLD_EARLY);
  expect(n.leftAt! - free).toBeLessThan(HOLD_LATE);
  expect(await pageY(page)).toBeGreaterThan(exit + GESTURE_PAST);
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
      test(`at ${viewport.width} px wheeling down ${speed} shows every step in order, held at most briefly at the end`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto("/");
        await watch(page);
        const { top, end } = await range(page);
        const exit = await exitScroll(section(page));
        const from = top - LEAD_IN;
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), from);
        await note(page, exit);
        await wheelDown(page, delta, every, Math.ceil((end - from) / delta), end);
        // Nothing holds the page on the way: it ends past the section, is never carried back, and is held only at the exit.
        const n = await notes(page);
        expect(n.backs).toBe(0);
        expect(await pageY(page)).toBeGreaterThan(end);
        expectHeldOnlyAtTheExit(n, exit, await holdCap(page));
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

  test.describe("the hold at the end", () => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      test(`at ${viewport.width} px a fast wheel at the end is held until the cell has opened, then goes on`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto("/");
        const exit = await arriveAtCells(page);
        const cap = await holdCap(page);
        await wheelDown(page, FAST_NOTCH, FAST_EVERY, 0, exit + viewport.height);
        const n = await notes(page);
        // Held at the exit, never carried back, and let go only once the panel has finished opening.
        expect(n.held.length).toBeGreaterThan(0);
        expectHeldOnlyAtTheExit(n, exit, cap);
        expect(n.backs).toBe(0);
        expect(n.openEndAt).toBeDefined();
        expect(n.leftAt).toBeDefined();
        expect(n.leftAt!).toBeGreaterThanOrEqual(n.openEndAt!);
        expect(n.leftAt! - n.openEndAt!).toBeLessThan(HOLD_LATE);
        // The next wheels go on as usual.
        expect(await pageY(page)).toBeGreaterThan(exit + viewport.height);
      });

      test(`at ${viewport.width} px a fast wheel that runs ahead of the walkthrough is held at the end for the cap at most, then goes on`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto("/");
        await watch(page);
        const { top } = await range(page);
        const exit = await exitScroll(section(page));
        const cap = await holdCap(page);
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top - LEAD_IN);
        await note(page, exit);
        await wheelDown(page, FAST_NOTCH, FAST_EVERY, 0, exit + viewport.height);
        const n = await notes(page);
        // Held at the exit before the last step showed, never carried back, and let go at the cap.
        expect(n.held.length).toBeGreaterThan(0);
        expect(n.cellsAt === undefined || n.cellsAt > n.held[0]!.at).toBe(true);
        expectHeldOnlyAtTheExit(n, exit, cap);
        expect(n.backs).toBe(0);
        expect(n.leftAt! - n.held[0]!.at).toBeGreaterThan(cap - HOLD_EARLY);
        expect(n.leftAt! - n.held[0]!.at).toBeLessThan(cap + HOLD_LATE);
        expect(await pageY(page)).toBeGreaterThan(exit + viewport.height);
        // The walkthrough still shows every step, after the reader has gone on.
        await settlesOn(page, titles.at(-1)!);
        expect(await seen(page)).toEqual(titles);
      });
    }

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      test(`at ${viewport.width} px a trackpad swipe that runs on past the end stops at the exit until the cell has opened, then goes on`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto("/");
        await expectGestureHeldThenGoesOn(page, "mouse");
      });
    }

    test("locked at the exit, a trackpad swipe up or a key going up goes at once", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      const { exit, cdp } = await lockAtExit(page, "mouse");
      await gestureUp(page, cdp, GESTURE_STEP, "mouse");
      await nextFrame(page);
      expect(await pageY(page)).toBeLessThan(exit - GESTURE_STEP / 2);
      // Back down to the exit, locked again while the cell still opens, then a key up.
      await gestureDown(page, cdp, GESTURE_PAST, "mouse");
      await nextFrame(page);
      expect(Math.abs((await pageY(page)) - exit)).toBeLessThanOrEqual(ROUNDING_SLACK);
      await page.keyboard.press("PageUp");
      await expect.poll(() => pageY(page)).toBeLessThan(exit - 300);
      expect((await notes(page)).openEndAt).toBeUndefined();
    });

    test("scrolling keys at the end are held the same way, then go on", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      const exit = await arriveAtCells(page);
      const cap = await holdCap(page);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const until = Date.now() + KEEP_GOING_MS;
      for (const key of ["PageDown", " ", "ArrowDown"]) await page.keyboard.press(key);
      while ((await pageY(page)) <= exit + 900 && Date.now() < until) {
        await page.keyboard.press("PageDown");
        await page.waitForTimeout(FAST_EVERY);
      }
      const n = await notes(page);
      expect(n.held.length).toBeGreaterThan(0);
      expectHeldOnlyAtTheExit(n, exit, cap);
      expect(n.backs).toBe(0);
      expect(n.leftAt!).toBeGreaterThanOrEqual(n.openEndAt!);
    });

    test("scrolling up during the hold goes at once", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      const exit = await arriveAtCells(page);
      const size = page.viewportSize()!;
      await page.mouse.move(size.width / 2, size.height / 2);
      // Down into the hold, then straight back up while it lasts.
      for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, FAST_NOTCH);
        await page.waitForTimeout(FAST_EVERY);
      }
      await nextFrame(page);
      expect(Math.abs((await pageY(page)) - exit)).toBeLessThanOrEqual(ROUNDING_SLACK);
      await page.mouse.wheel(0, -300);
      await nextFrame(page);
      const n = await notes(page);
      expect(n.openEndAt).toBeUndefined();
      expect(await pageY(page)).toBeLessThan(exit - 300 + ROUNDING_SLACK + 1);
      expect(n.held.every(({ y }) => Math.abs(y - exit) <= ROUNDING_SLACK)).toBe(true);
    });

    test("a link that glides past the section during the hold is not stopped", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      const exit = await arriveAtCells(page);
      const size = page.viewportSize()!;
      await page.mouse.move(size.width / 2, size.height / 2);
      await page.mouse.wheel(0, FAST_NOTCH);
      await page.mouse.wheel(0, FAST_NOTCH);
      await nextFrame(page);
      expect(await pageY(page)).toBeLessThanOrEqual(exit + ROUNDING_SLACK);
      await page.locator(`a[href="#${getStarted.id}"]`).first().evaluate((link: HTMLElement) => link.click());
      expect((await notes(page)).openEndAt).toBeUndefined();
      await expect
        .poll(
          () =>
            page.evaluate((id) => {
              const target = document.getElementById(id)!;
              return Math.abs(target.getBoundingClientRect().top - parseFloat(getComputedStyle(target).scrollMarginTop));
            }, getStarted.id),
          { timeout: 2500 },
        )
        .toBeLessThan(2);
    });

    test.describe("on a phone, by touch", () => {
      test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

      test("a swipe at the end is held while the cell opens, then goes on, and never sticks", async ({ page }) => {
        await page.goto("/");
        const exit = await arriveAtCells(page);
        const cap = await holdCap(page);
        // The reader has come to rest at the end. A browser lets a touch move be stopped only before the page
        // starts to move under it, so a swipe that sets off above the end runs on, as does its momentum.
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), exit);
        const cdp = await page.context().newCDPSession(page);
        const touch = (type: "touchStart" | "touchMove" | "touchEnd", y: number) =>
          cdp.send("Input.dispatchTouchEvent", {
            type,
            touchPoints: type === "touchEnd" ? [] : [{ x: SWIPE_X, y }],
          });
        // Short swipes up the screen, one after another, as a reader flicks on past the end.
        const until = Date.now() + KEEP_GOING_MS;
        while ((await pageY(page)) <= exit + SWIPE_PAST && Date.now() < until) {
          await touch("touchStart", SWIPE_FROM);
          for (let y = SWIPE_FROM - SWIPE_STEP; y >= SWIPE_TO; y -= SWIPE_STEP) await touch("touchMove", y);
          await touch("touchEnd", SWIPE_TO);
        }
        const n = await notes(page);
        expect(n.held.length).toBeGreaterThan(0);
        expectHeldOnlyAtTheExit(n, exit, cap);
        expect(n.backs).toBe(0);
        expect(n.leftAt!).toBeGreaterThanOrEqual(n.openEndAt!);
        expect(n.leftAt! - n.openEndAt!).toBeLessThan(HOLD_LATE);
        expect(await pageY(page)).toBeGreaterThan(exit + SWIPE_PAST);
      });

      test("a fling that runs on past the end stops at the exit until the cell has opened, then goes on", async ({ page }) => {
        await page.goto("/");
        await expectGestureHeldThenGoesOn(page, "touch");
      });

      test("locked at the exit, a swipe back down the screen goes up at once", async ({ page }) => {
        await page.goto("/");
        const { exit, cdp } = await lockAtExit(page, "touch");
        await gestureUp(page, cdp, GESTURE_STEP, "touch");
        await nextFrame(page);
        expect(await pageY(page)).toBeLessThan(exit - GESTURE_STEP / 2);
        expect((await notes(page)).openEndAt).toBeUndefined();
      });
    });
  });
});
