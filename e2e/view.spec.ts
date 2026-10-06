import { expect, test, type Locator, type Page } from "@playwright/test";
import { flushRenders } from "./clock";

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

type Pose = { opacity: number; y: number; blur: number };

/** How a view looks `ms` into leaving, and `ms` into arriving. */
const leaving = (ms: number): Pose => {
  const p = cubicBezier(LEAVE.ease)(ms / LEAVE.ms);
  return { opacity: 1 - p, y: LEAVE.sink * p, blur: LEAVE.blur * p };
};
const arriving = (ms: number): Pose => {
  const p = cubicBezier(ARRIVE.ease)(ms / ARRIVE.ms);
  return { opacity: p, y: ARRIVE.rise * (1 - p), blur: ARRIVE.blur * (1 - p) };
};

/**
 * Picks a view with `control`, clicked from inside the page, and holds the
 * switch still in the same task, before the browser draws a frame of it. The
 * browser runs the switch on its own time, which the page's clock does not
 * hold, so each test moves it on by hand. Focus stays where it was.
 */
const pick = (control: Locator) =>
  control.evaluate((element: HTMLElement) => {
    element.click();
    for (const id of ["human", "agent"]) for (const animation of document.getElementById(id)!.getAnimations()) animation.pause();
  });

/** Holds `view`'s main element `ms` into the phase under way, and reads how it looks there. */
const hold = (page: Page, view: string, ms = 0) =>
  page.evaluate(
    ([view, ms]) => {
      const main = document.getElementById(view)!;
      const running = main.getAnimations();
      for (const animation of running) {
        animation.pause();
        animation.currentTime = ms;
      }
      const style = getComputedStyle(main);
      const blur = /blur\(([\d.]+)px\)/.exec(style.filter);
      return {
        shown: style.display !== "none",
        running: running.length,
        opacity: Number(style.opacity),
        y: style.transform === "none" ? 0 : new DOMMatrix(style.transform).m42,
        blur: blur ? Number(blur[1]) : 0,
        transform: style.transform,
        filter: style.filter,
      };
    },
    [view, ms] as const,
  );

/** Runs the phase under way to its end, and holds the next one, if there is one, at its start. */
const nextPhase = (page: Page) =>
  page.evaluate(async () => {
    const mains = ["human", "agent"].map((id) => document.getElementById(id)!);
    const running = mains.flatMap((main) => main.getAnimations());
    for (const animation of running) animation.finish();
    await Promise.allSettled(running.map((animation) => animation.finished));
    for (const animation of mains.flatMap((main) => main.getAnimations())) animation.pause();
  });

/** Runs the switch to its end. */
async function settle(page: Page) {
  for (let phase = 0; phase < 4; phase++) await nextPhase(page);
}

/** `view`, held `ms` into its phase, looks as `at` says it should there. */
async function expectPose(page: Page, view: string, at: (ms: number) => Pose, ms: number) {
  const drawn = await hold(page, view, ms);
  expect(drawn.shown, `${view} is on the page`).toBe(true);
  expect(drawn.running).toBe(1);
  const expected = at(ms);
  for (const key of ["opacity", "y", "blur"] as const) {
    expect(drawn[key], `${view}'s ${key} ${ms}ms in`).toBeCloseTo(expected[key], 2);
  }
  return drawn;
}

/** A view at rest: whole, in place, sharp, and nothing left running on it. */
async function expectAtRest(page: Page, view: string) {
  expect(await hold(page, view)).toMatchObject({ shown: true, running: 0, opacity: 1, transform: "none", filter: "none" });
  expect(await page.locator(`#${view} pre, #${view} h1`).first().evaluate((el) => getComputedStyle(el).filter)).toBe("none");
}

const shown = async (page: Page, view: string) => (await hold(page, view)).shown;

const views = (page: Page) => ({
  human: page.getByRole("button", { name: "For humans" }),
  agent: page.getByRole("button", { name: "For agents" }),
});

test.describe("switching views", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const [from, to] of [
    ["human", "agent"],
    ["agent", "human"],
  ] as const) {
    test(`from ${from} to ${to}, the ${from} view sinks into a blur and the ${to} view rises out of one`, async ({
      page,
    }) => {
      await page.goto("/");
      if (from === "agent") {
        await pick(views(page).agent);
        await settle(page);
        await expectAtRest(page, "agent");
      }

      await pick(views(page)[to]);
      // The switch shows the pick at once, while the page is still leaving.
      await flushRenders(page);
      await expect(views(page)[to]).toHaveAttribute("aria-pressed", "true");

      await expectPose(page, from, leaving, 0);
      await expectPose(page, from, leaving, 150);
      expect(await shown(page, to)).toBe(false);

      // Out, then in: the other view takes its place once this one has gone, and opens at its top.
      await nextPhase(page);
      expect(await shown(page, from)).toBe(false);
      expect(await page.evaluate(() => scrollY)).toBe(0);
      await expectPose(page, to, arriving, 0);
      // 120ms in, the view arriving is still well short of whole: any sooner and the switch reads as a cut.
      const early = await expectPose(page, to, arriving, 120);
      expect(early.opacity).toBeLessThan(0.5);
      await expectPose(page, to, arriving, 250);

      await nextPhase(page);
      await expectAtRest(page, to);
      expect(await page.evaluate(() => document.documentElement.dataset.view ?? "human")).toBe(to);
    });
  }

  test("rapid toggling ends on the view picked last", async ({ page }) => {
    await page.goto("/");
    const { human, agent } = views(page);

    await pick(agent);
    const half = await hold(page, "human", 200);
    expect(half.opacity).toBeLessThan(0.9);

    // Picked again before it has gone, the human view rises back from where it was, not from rest.
    await pick(human);
    const turn = await hold(page, "human", 0);
    expect(turn.running).toBe(1);
    expect(turn.opacity).toBeLessThan(1);
    expect(turn.opacity).toBeCloseTo(half.opacity, 2);
    expect(turn.blur).toBeCloseTo(half.blur, 2);
    const back = await hold(page, "human", 100);
    expect(back.shown).toBe(true);
    expect(back.opacity).toBeGreaterThan(half.opacity);
    expect(back.blur).toBeLessThan(half.blur);
    expect(await shown(page, "agent")).toBe(false);

    // Once more to the agent view, then back to human and to and fro as the agent view is arriving.
    await pick(agent);
    await nextPhase(page);
    expect((await hold(page, "agent", 100)).shown).toBe(true);
    await pick(human);
    await pick(agent);
    await pick(human);

    await settle(page);
    await expectAtRest(page, "human");
    expect(await shown(page, "agent")).toBe(false);
    await flushRenders(page);
    await expect(human).toHaveAttribute("aria-pressed", "true");
    await expect(agent).toHaveAttribute("aria-pressed", "false");
  });

  test("however many switches, at most one reduced-motion listener is attached, and none at rest", async ({ page }) => {
    // Counts the change listeners left on lists for the reduced-motion query, list by list: one taken off a
    // different list than it went on stays counted.
    await page.addInitScript(() => {
      const w = window as unknown as { reducedMotionListeners: number };
      w.reducedMotionListeners = 0;
      const { addEventListener: add, removeEventListener: remove } = MediaQueryList.prototype;
      const counted = new WeakMap<MediaQueryList, Set<EventListenerOrEventListenerObject>>();
      const on = (list: MediaQueryList) => counted.get(list) ?? counted.set(list, new Set()).get(list)!;
      const watched = (list: MediaQueryList, type: string) => type === "change" && list.media.includes("reduced-motion");
      MediaQueryList.prototype.addEventListener = function (this: MediaQueryList, type: string, listener: EventListenerOrEventListenerObject, ...rest: unknown[]) {
        if (watched(this, type) && listener && !on(this).has(listener)) {
          on(this).add(listener);
          w.reducedMotionListeners++;
        }
        return add.call(this, type, listener, ...(rest as []));
      } as typeof add;
      MediaQueryList.prototype.removeEventListener = function (this: MediaQueryList, type: string, listener: EventListenerOrEventListenerObject, ...rest: unknown[]) {
        if (watched(this, type) && on(this).delete(listener)) w.reducedMotionListeners--;
        return remove.call(this, type, listener, ...(rest as []));
      } as typeof remove;
    });
    await page.goto("/");
    const listeners = () => page.evaluate(() => (window as unknown as { reducedMotionListeners: number }).reducedMotionListeners);
    const { human, agent } = views(page);
    // The count is taken once the page has hydrated, with its own listeners on: a switch there and back is the proof.
    await agent.click();
    await expect(human).toHaveAttribute("aria-pressed", "false");
    await settle(page);
    await pick(human);
    await settle(page);
    const atStart = await listeners();
    for (let round = 0; round < 5; round++) {
      await pick(agent);
      await pick(human);
      await pick(agent);
      expect(await listeners()).toBeLessThanOrEqual(atStart + 1);
      await settle(page);
      await pick(human);
      await settle(page);
    }
    expect(await listeners()).toBe(atStart);
  });

  test("focus stays on the switch, and the other view opens at its top", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => scrollTo(0, 2000));
    await views(page).agent.focus();
    await pick(views(page).agent);
    await hold(page, "human", 150);
    // The view leaves from where the reader was: the page scrolls at the swap, not on the pick.
    expect(await page.evaluate(() => scrollY)).toBe(2000);

    await settle(page);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(views(page).agent).toBeFocused();
  });

  test("from the footer menu on a phone, focus goes back to the menu's button", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const menu = page.getByRole("button", { name: "Page format" });

    await menu.click();
    await pick(page.getByRole("menuitemradio", { name: "Agent" }));
    await expectPose(page, "human", leaving, 150);

    await settle(page);
    await expectAtRest(page, "agent");
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(menu).toBeFocused();
  });

  test("with reduced motion the switch is instant", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await pick(views(page).agent);
    await expectAtRest(page, "agent");
    expect(await shown(page, "human")).toBe(false);

    await pick(views(page).human);
    await expectAtRest(page, "human");
    expect(await shown(page, "agent")).toBe(false);
  });

  test("asking for reduced motion mid-switch ends the switch at once", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => scrollTo(0, 2000));
    await pick(views(page).agent);
    await expectPose(page, "human", leaving, 150);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => shown(page, "agent")).toBe(true);
    await expectAtRest(page, "agent");
    expect(await shown(page, "human")).toBe(false);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });
});
