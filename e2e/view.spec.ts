import { expect, test, type Page } from "@playwright/test";
import { FRAME, flushRenders, installClock, stopClockASecondOn } from "./clock";

const headline = "Get your human and AI teammates on the same page.";

test.describe("page format", () => {
  test("the footer menu switches to the agent view and back", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: headline })).toBeVisible();

    await page.getByRole("button", { name: "Page format" }).click();
    await page.getByRole("menuitemradio", { name: "Agent" }).click();
    await expect(page.getByRole("heading", { level: 1, name: headline })).toBeHidden();
    await expect(page.getByText("uno-blueprint.md")).toBeVisible();

    await page.getByRole("button", { name: "Page format" }).click();
    await page.getByRole("menuitemradio", { name: "Human" }).click();
    await expect(page.getByRole("heading", { level: 1, name: headline })).toBeVisible();
    await expect(page.getByText("uno-blueprint.md")).toBeHidden();
  });

  test("the nav switch and the footer menu agree", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const forAgents = page.getByRole("button", { name: "For agents" });

    await forAgents.click();
    await expect(forAgents).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Page format" }).click();
    await expect(page.getByRole("menuitemradio", { name: "Agent" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});

/**
 * The switch, as designed: the view on screen sinks 12px into an 8px blur and
 * fades over 300ms, easing in; then the other rises 20px out of a 10px blur
 * over 500ms, easing out gently.
 */
const LEAVE = { ms: 300, sink: 12, blur: 8, ease: [0.55, 0, 0.75, 0.2] } as const;
const ARRIVE = { ms: 500, rise: 20, blur: 10, ease: [0.33, 0, 0.2, 1] } as const;

/** A CSS cubic-bezier() timing function. */
function cubicBezier([x1, y1, x2, y2]: readonly [number, number, number, number]) {
  const along = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  return (x: number) => {
    let low = 0;
    let high = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (low + high) / 2;
      if (along(x1, x2, mid) < x) low = mid;
      else high = mid;
    }
    return along(y1, y2, (low + high) / 2);
  };
}

type Look = { opacity: number; y: number; blur: number };

/** How a view looks `ms` into leaving, and `ms` into arriving. */
const leaving = (ms: number): Look => {
  const p = cubicBezier(LEAVE.ease)(Math.min(1, Math.max(0, ms / LEAVE.ms)));
  return { opacity: 1 - p, y: LEAVE.sink * p, blur: LEAVE.blur * p };
};
const arriving = (ms: number): Look => {
  const p = cubicBezier(ARRIVE.ease)(Math.min(1, Math.max(0, ms / ARRIVE.ms)));
  return { opacity: p, y: ARRIVE.rise * (1 - p), blur: ARRIVE.blur * (1 - p) };
};

/** A view's main element as drawn: its opacity, how far down it is moved, and its blur, from its computed style. */
const look = (page: Page, view: string) =>
  page.locator(`#${view}`).evaluate((main) => {
    const style = getComputedStyle(main);
    const blur = /blur\(([\d.]+)px\)/.exec(style.filter);
    return {
      shown: style.display !== "none",
      opacity: Number(style.opacity),
      y: style.transform === "none" ? 0 : new DOMMatrix(style.transform).m42,
      blur: blur ? Number(blur[1]) : 0,
      transform: style.transform,
      filter: style.filter,
      animations: main.getAnimations().length,
    };
  });

/**
 * The page's clock moves its frames on 16ms at a time, so `ms` into a phase the
 * last frame drawn fell somewhere in the frame before: each value lies between
 * the look `frames` frames earlier and the look at `ms`. The arrival starts on
 * the frame the leaving view is gone, itself up to a frame late, so it allows two.
 */
async function expectMidway(page: Page, view: string, at: (ms: number) => Look, ms: number, frames = 1) {
  const drawn = await look(page, view);
  expect(drawn.shown).toBe(true);
  const [early, late] = [at(ms - frames * FRAME), at(ms)];
  for (const key of ["opacity", "y", "blur"] as const) {
    const [low, high] = [Math.min(early[key], late[key]), Math.max(early[key], late[key])];
    expect(drawn[key], `${view}'s ${key} ${ms}ms in`).toBeGreaterThanOrEqual(low - 0.02);
    expect(drawn[key], `${view}'s ${key} ${ms}ms in`).toBeLessThanOrEqual(high + 0.02);
  }
  // Truly mid-animation: neither where it started nor where it ends.
  expect(drawn.opacity).toBeGreaterThan(0.02);
  expect(drawn.opacity).toBeLessThan(0.98);
}

/** A view at rest: whole, in place, sharp, and nothing left running on it. */
async function expectAtRest(page: Page, view: string) {
  const drawn = await look(page, view);
  expect(drawn).toMatchObject({ shown: true, opacity: 1, transform: "none", filter: "none", animations: 0 });
  expect(await page.locator(`#${view} pre, #${view} h1`).first().evaluate((el) => getComputedStyle(el).filter)).toBe("none");
}

const views = (page: Page) => ({
  human: page.getByRole("button", { name: "For humans" }),
  agent: page.getByRole("button", { name: "For agents" }),
});

/** Opens the page on its stopped clock, wide enough for the nav's switch. */
async function open(page: Page) {
  await installClock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await stopClockASecondOn(page);
}

test.describe("switching views", () => {
  for (const [from, to] of [
    ["human", "agent"],
    ["agent", "human"],
  ] as const) {
    test(`from ${from} to ${to}, the ${from} view sinks into a blur and the ${to} view rises out of one`, async ({
      page,
    }) => {
      await open(page);
      if (from === "agent") {
        await views(page).agent.click();
        await page.clock.runFor(2000);
        await expectAtRest(page, "agent");
      }

      await views(page)[to].click();
      // The switch shows the pick at once, while the page is still leaving.
      await flushRenders(page);
      await expect(views(page)[to]).toHaveAttribute("aria-pressed", "true");

      await page.clock.runFor(150);
      await expectMidway(page, from, leaving, 150);
      expect((await look(page, to)).shown).toBe(false);

      // Out, then in: the other view takes its place once this one has gone.
      await page.clock.runFor(LEAVE.ms - 150 + FRAME);
      expect((await look(page, from)).shown).toBe(false);
      expect(await page.evaluate(() => scrollY)).toBe(0);
      const start = await look(page, to);
      expect(start.opacity).toBeLessThan(0.3);
      expect(start.blur).toBeGreaterThan(ARRIVE.blur * 0.6);
      expect(start.y).toBeGreaterThan(ARRIVE.rise * 0.6);

      // 120ms in, the view arriving is still well short of whole: any sooner and the switch reads as a cut.
      await page.clock.runFor(120 - FRAME);
      await expectMidway(page, to, arriving, 120, 2);
      expect((await look(page, to)).opacity).toBeLessThan(0.5);

      await page.clock.runFor(250 - 120);
      await expectMidway(page, to, arriving, 250, 2);

      await page.clock.runFor(ARRIVE.ms - 250 + 2 * FRAME);
      await expectAtRest(page, to);
      expect(await page.evaluate(() => document.documentElement.dataset.view ?? "human")).toBe(to);
    });
  }

  test("rapid toggling ends on the view picked last", async ({ page }) => {
    await open(page);
    const { human, agent } = views(page);

    await agent.click();
    await page.clock.runFor(200);
    const half = await look(page, "human");
    expect(half.opacity).toBeLessThan(0.9);

    // Picked again before it has gone, the human view rises back from where it was.
    await human.click();
    await page.clock.runFor(100);
    const back = await look(page, "human");
    expect(back.shown).toBe(true);
    expect(back.opacity).toBeGreaterThan(half.opacity);
    expect(back.blur).toBeLessThan(half.blur);
    expect((await look(page, "agent")).shown).toBe(false);

    // Once more to the agent view, then back to human as the agent view is arriving.
    await agent.click();
    await page.clock.runFor(LEAVE.ms + 100);
    expect((await look(page, "agent")).shown).toBe(true);
    await human.click();
    await agent.click();
    await human.click();

    await page.clock.runFor(2000);
    await expectAtRest(page, "human");
    expect((await look(page, "agent")).shown).toBe(false);
    await flushRenders(page);
    await expect(human).toHaveAttribute("aria-pressed", "true");
    await expect(agent).toHaveAttribute("aria-pressed", "false");
  });

  test("focus stays on the switch, and the other view opens at its top", async ({ page }) => {
    await open(page);
    await page.evaluate(() => scrollTo(0, 2000));
    await views(page).agent.click();
    await page.clock.runFor(150);
    // The view leaves from where the reader was.
    expect(await page.evaluate(() => scrollY)).toBe(2000);

    await page.clock.runFor(2000);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(views(page).agent).toBeFocused();
  });

  test("from the footer menu on a phone, focus goes back to the menu's button", async ({ page }) => {
    await installClock(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await stopClockASecondOn(page);
    const menu = page.getByRole("button", { name: "Page format" });

    await menu.click();
    await page.getByRole("menuitemradio", { name: "Agent" }).click();
    await page.clock.runFor(150);
    await expectMidway(page, "human", leaving, 150);

    await page.clock.runFor(2000);
    await expectAtRest(page, "agent");
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(menu).toBeFocused();
  });

  test("with reduced motion the switch is instant", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);

    await views(page).agent.click();
    // Not a moment of the page's clock has passed.
    await expectAtRest(page, "agent");
    expect((await look(page, "human")).shown).toBe(false);

    await views(page).human.click();
    await expectAtRest(page, "human");
    expect((await look(page, "agent")).shown).toBe(false);
  });
});
