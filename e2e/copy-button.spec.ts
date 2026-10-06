import { expect, test, type Locator, type Page } from "@playwright/test";
import { flushRenders, installClock, stopClockASecondOn } from "./clock";

test.use({ permissions: ["clipboard-read", "clipboard-write"], viewport: { width: 1440, height: 900 } });

/** What an icon looks like, read from its computed style. */
type Look = { opacity: number; blur: number; scale: number };

const look = (icon: Locator): Promise<Look> =>
  icon.evaluate((svg) => {
    const style = getComputedStyle(svg);
    const blur = /blur\(([\d.]+)px\)/.exec(style.filter);
    return {
      opacity: Number(style.opacity),
      blur: blur ? Number(blur[1]) : 0,
      scale: style.scale === "none" ? 1 : Number(style.scale.split(" ")[0]),
    };
  });

/**
 * Holds every transition on `button`'s icons at `ms` in, so a frame of the
 * swap can be read, and says how many there were; `ms` past the end lets them
 * finish. The button's own fade in on hover is left out.
 */
const holdAt = (button: Locator, ms: number) =>
  button.evaluate((element, at) => {
    const running = element
      .getAnimations({ subtree: true })
      .filter(
        (animation) =>
          animation instanceof CSSTransition &&
          animation.effect instanceof KeyframeEffect &&
          animation.effect.target instanceof SVGElement,
      );
    for (const animation of running) {
      animation.pause();
      animation.currentTime = at;
    }
    return running.length;
  }, ms);

/**
 * CSS transitions run on the browser's own time, not the page's clock: this
 * pauses each one on `button`'s icons as it starts, so a slow run cannot let
 * the swap end before `holdAt` reads it.
 */
const pauseIconsAsTheyStart = (button: Locator) =>
  button.evaluate((element) => {
    element.addEventListener("transitionrun", (event) => {
      if (!(event.target instanceof SVGElement)) return;
      for (const animation of event.target.getAnimations()) animation.pause();
    });
  });

/** Lets every transition on `button`'s icons run to its end. */
const finish = (button: Locator) => holdAt(button, 60_000);

const shown: Look = { opacity: 1, blur: 0, scale: 1 };
const hidden: Look = { opacity: 0, blur: 4, scale: 0.8 };

/** Opens the page with its clock stopped, and finds the npm box's copy button and its two icons. */
async function openCopyButton(page: Page) {
  await installClock(page);
  await page.goto("/");
  await stopClockASecondOn(page);
  const box = page.getByRole("tabpanel", { name: "npm", exact: true });
  await box.hover();
  const button = box.getByRole("button", { name: "Copy" });
  await pauseIconsAsTheyStart(button);
  return { box, button, copyIcon: button.locator("svg.lucide-copy"), tick: button.locator("svg.lucide-check") };
}

test("the copy icon blurs into the tick, and the tick back into the copy icon when it times out", async ({ page }) => {
  const { box, button, copyIcon, tick } = await openCopyButton(page);
  expect(await look(copyIcon)).toEqual(shown);
  expect(await look(tick)).toEqual(hidden);
  for (const icon of [copyIcon, tick]) await expect(icon).toHaveCSS("transition-duration", "0.2s");

  await button.click();
  await expect(box.getByRole("status")).toHaveText("Copied");

  // 60 ms in, both icons are still part blurred, part faded and part grown:
  // the swap must not be mostly over this early, or it reads as a snap.
  expect(await holdAt(button, 60)).toBeGreaterThan(0);
  for (const icon of [copyIcon, tick]) {
    const { opacity, blur, scale } = await look(icon);
    expect(opacity).toBeGreaterThan(0.25);
    expect(opacity).toBeLessThan(0.75);
    expect(blur).toBeGreaterThan(1);
    expect(blur).toBeLessThan(3);
    expect(scale).toBeGreaterThan(0.85);
    expect(scale).toBeLessThan(0.95);
  }
  // The swap takes about 200 ms: by then it has landed.
  await holdAt(button, 200);
  expect(await look(copyIcon)).toEqual(hidden);
  expect(await look(tick)).toEqual(shown);
  await finish(button);

  // The tick times out on the page's clock, and the swap runs the other way.
  await page.clock.runFor(1200);
  await flushRenders(page);
  await expect(box.getByRole("status")).toHaveText("");
  expect(await holdAt(button, 60)).toBeGreaterThan(0);
  const back = await look(copyIcon);
  expect(back.opacity).toBeGreaterThan(0.25);
  expect(back.opacity).toBeLessThan(0.75);
  expect(back.blur).toBeGreaterThan(1);
  expect(back.blur).toBeLessThan(3);
  await finish(button);
  expect(await look(copyIcon)).toEqual(shown);
  expect(await look(tick)).toEqual(hidden);
});

test("with reduced motion the copy icon and the tick swap at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { box, button, copyIcon, tick } = await openCopyButton(page);

  await button.click();
  await expect(box.getByRole("status")).toHaveText("Copied");
  // Read straight after the click, without waiting: there is no transition to wait for.
  expect(await holdAt(button, 0)).toBe(0);
  expect(await look(copyIcon)).toEqual(hidden);
  expect(await look(tick)).toEqual(shown);

  await page.clock.runFor(1200);
  await flushRenders(page);
  await expect(box.getByRole("status")).toHaveText("");
  expect(await holdAt(button, 0)).toBe(0);
  expect(await look(copyIcon)).toEqual(shown);
  expect(await look(tick)).toEqual(hidden);
});
