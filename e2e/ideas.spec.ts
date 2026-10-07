import { expect, test, type Page } from "@playwright/test";

const section = (page: Page) => page.locator("#ideas");
const voice = (page: Page, name: string) => section(page).getByRole("link", { name: new RegExp(name) });
const arrow = (page: Page, name: string) => voice(page, name).locator("[data-arrow]");
const plus = (page: Page) => section(page).getByRole("heading", { name: "PLUS Uno Blueprint" });

/** From one disc's left edge to the next's, in px: 40px discs a third overlapped at rest, 6px apart when spread. */
const REST = 40 - 40 / 3;
const SPREAD = 40 + 6;
/** A fixed time into the spread, not a fraction of it: a curve that reads as instant fails it. */
const MID_SPREAD = 100;

const stackDiscs = (page: Page) => voice(page, "Andy Polaine").locator("[data-stack] > span");

const stackSteps = (page: Page) =>
  stackDiscs(page).evaluateAll((discs) =>
    discs.slice(1).map((disc, i) => disc.getBoundingClientRect().left - discs[i]!.getBoundingClientRect().left),
  );

/** Pauses each disc's transition the moment it starts, so a slow machine cannot run it out before it is read. */
const holdStack = (page: Page) =>
  stackDiscs(page).evaluateAll((discs) => {
    for (const disc of discs) {
      disc.addEventListener("transitionrun", () => {
        for (const animation of disc.getAnimations()) animation.pause();
      });
    }
  });

/** Moves the held transitions to `ms` after they began, and measures the stack there. */
const stackStepsAt = (page: Page, ms: number) =>
  stackDiscs(page).evaluateAll((discs, ms) => {
    const running = discs.flatMap((disc) => disc.getAnimations());
    if (running.length !== 2) throw new Error(`expected two discs moving, found ${running.length}`);
    for (const animation of running) {
      animation.pause();
      animation.currentTime = ms;
    }
    return discs.slice(1).map((disc, i) => disc.getBoundingClientRect().left - discs[i]!.getBoundingClientRect().left);
  }, ms);

/** Every disc sits `step` px from the one before. */
async function expectSteps(page: Page, step: number) {
  for (const actual of await stackSteps(page)) expect(actual).toBeCloseTo(step, 0);
}

const finishStack = (page: Page) =>
  stackDiscs(page).evaluateAll((discs) => {
    for (const disc of discs) for (const animation of disc.getAnimations()) animation.finish();
  });

/** Scrolls so the top of `selector` sits `fromTop` px below the top of the screen. */
async function scrollTo(page: Page, selector: string, fromTop: number) {
  await page.evaluate(
    ([sel, offset]) => {
      const element = document.querySelector(sel)!;
      window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - offset);
    },
    [selector, fromTop] as const,
  );
}

test.describe("on a wide screen", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("each voice arrives as the line reaches it, and the PLUS card at its end", async ({ page }) => {
    await page.goto("/");
    await expect(section(page).getByRole("heading", { name: "Ideas we build on." })).toBeVisible();

    await scrollTo(page, "#ideas h2", 900);
    await expect(voice(page, "G. Lynn Shostack")).toHaveCSS("opacity", "0");

    // The line reaches 70% of the way down the screen: the first voices are there, the last are not.
    await scrollTo(page, "[data-voice]", 500);
    await expect(voice(page, "G. Lynn Shostack")).toHaveCSS("opacity", "1");
    await expect(voice(page, "Birgitta Böckeler")).toHaveCSS("opacity", "0");
    await expect(page.locator("#ideas [data-end]")).toHaveCSS("opacity", "0");

    await scrollTo(page, "[data-end]", 400);
    await expect(voice(page, "Birgitta Böckeler")).toHaveCSS("opacity", "1");
    await expect(page.locator("#ideas [data-end]")).toHaveCSS("opacity", "1");
  });

  test("each voice links to where it was said", async ({ page }) => {
    await page.goto("/");
    await expect(section(page).locator("[data-voice]")).toHaveCount(9);
    await expect(voice(page, "Andrej Karpathy")).toHaveAttribute("href", /gist\.github\.com\/karpathy/);
  });

  test("a voice with a cleared portrait shows it, and everyone else shows initials", async ({ page }) => {
    await page.goto("/");
    // Eight voices, and the two co-authors stacked behind Andy Polaine.
    const portraits = section(page).locator("[data-voice] img");
    await expect(portraits).toHaveCount(10);
    for (const portrait of await portraits.all()) {
      await portrait.scrollIntoViewIfNeeded();
      // A broken file still renders an img; only a decoded one has a width.
      await expect.poll(() => portrait.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    }
    await expect(voice(page, "Andy Polaine").locator("[data-stack] img")).toHaveCount(3);
    await expect(voice(page, "Sarah Gibbons").locator("[data-stack]")).toHaveCount(0);
    await expect(voice(page, "G. Lynn Shostack")).toContainText("GL");
    await expect(voice(page, "G. Lynn Shostack").locator("img")).toHaveCount(0);
  });

  test("the co-author stack overlaps at rest and spreads on hover", async ({ page }) => {
    await page.goto("/");
    await voice(page, "Andy Polaine").scrollIntoViewIfNeeded();
    await expectSteps(page, REST);
    await holdStack(page);
    await voice(page, "Andy Polaine").hover();
    await expect.poll(() => stackDiscs(page).evaluateAll((discs) => discs.flatMap((disc) => disc.getAnimations()).length)).toBe(2);
    const [front, back] = await stackStepsAt(page, MID_SPREAD);
    // Most of the way out by then, the last disc a beat behind; neither there yet.
    expect(front).toBeGreaterThan(REST + (SPREAD - REST) / 2);
    expect(front).toBeLessThan(SPREAD);
    expect(back).toBeLessThan(front!);
    await finishStack(page);
    await expectSteps(page, SPREAD);
  });

  test("the co-author stack spreads when the card has keyboard focus", async ({ page }) => {
    await page.goto("/");
    await voice(page, "Andy Polaine").scrollIntoViewIfNeeded();
    const [front, back] = await voice(page, "Andy Polaine").evaluate((card: HTMLElement, ms) => {
      card.focus();
      const discs = [...card.querySelectorAll<HTMLElement>("[data-stack] > span")];
      for (const disc of discs) for (const animation of disc.getAnimations()) {
        animation.pause();
        animation.currentTime = ms;
      }
      return discs.slice(1).map((disc, i) => disc.getBoundingClientRect().left - discs[i]!.getBoundingClientRect().left);
    }, MID_SPREAD);
    expect(front).toBeGreaterThan(REST + (SPREAD - REST) / 2);
    expect(front).toBeLessThan(SPREAD);
    expect(back).toBeLessThan(front!);
  });

  test("each voice opens its source in a new tab, and says so", async ({ page }) => {
    await page.goto("/");
    const cards = section(page).locator("[data-voice]");
    for (const card of await cards.all()) {
      await expect(card).toHaveAttribute("target", "_blank");
      await expect(card).toHaveAttribute("rel", "noopener noreferrer");
      await expect(card).toHaveAccessibleName(/\(opens in a new tab\)$/);
    }
    // Links that stay on the page still open where they are.
    await expect(page.locator('a[href^="#"][target]')).toHaveCount(0);
  });

  test("a voice's outward arrow shows on hover and on keyboard focus", async ({ page }) => {
    await page.goto("/");
    await scrollTo(page, "[data-end]", 400);
    const card = voice(page, "Andrej Karpathy");
    await expect(arrow(page, "Andrej Karpathy")).toHaveCSS("opacity", "0");
    // It eases in with the card's border: the same duration and the same easing.
    await expect(arrow(page, "Andrej Karpathy")).toHaveCSS("transition-duration", "0.2s");
    const borderEasing = await card.evaluate((el) => {
      const style = getComputedStyle(el);
      const properties = style.transitionProperty.split(", ");
      // Split on the commas between easings, not those inside a cubic-bezier().
      const easings = style.transitionTimingFunction.split(/,\s*(?![^(]*\))/);
      return easings[properties.indexOf("border-color")];
    });
    await expect(arrow(page, "Andrej Karpathy")).toHaveCSS("transition-timing-function", borderEasing!);
    await card.hover();
    await expect(arrow(page, "Andrej Karpathy")).toHaveCSS("opacity", "1");
    await page.mouse.move(0, 0);
    await expect(arrow(page, "Andrej Karpathy")).toHaveCSS("opacity", "0");
    await card.focus();
    await expect(arrow(page, "Andrej Karpathy")).toHaveCSS("opacity", "1");
    // It sits in the card's top-right corner.
    const box = (await card.boundingBox())!;
    const icon = (await arrow(page, "Andrej Karpathy").boundingBox())!;
    expect(icon.x + icon.width).toBeGreaterThan(box.x + box.width - 32);
    expect(icon.y).toBeLessThan(box.y + 32);
  });

  test("the PLUS card shows its buttons over the screenshot on hover", async ({ page }) => {
    await page.goto("/");
    await scrollTo(page, "[data-end]", 100);
    const blueprint = section(page).getByRole("link", { name: "See the PLUS blueprint" });
    // One pair of buttons is in the page at a time: the pair over the screenshot.
    await expect(blueprint).toHaveCount(1);
    await expect(blueprint).toHaveAttribute("href", "https://plus-uno.netlify.app/blueprint/");
    const overlay = blueprint.locator("..");
    await expect(overlay).toHaveCSS("opacity", "0");
    await plus(page).hover();
    await expect(overlay).toHaveCSS("opacity", "1");
  });

  test("the case study is not linked until it exists", async ({ page }) => {
    await page.goto("/");
    const caseStudy = section(page).getByRole("link", { name: "Case study coming soon" });
    await expect(caseStudy).toHaveAttribute("aria-disabled", "true");
    await expect(caseStudy).not.toHaveAttribute("href", /.*/);
    await expect(caseStudy).toHaveCSS("cursor", "not-allowed");
  });
});

test.describe("on a touch screen", () => {
  test.use({ viewport: { width: 1440, height: 900 }, hasTouch: true, isMobile: true });

  test("the co-author stack is spread from the start, with nothing to hover", async ({ page }) => {
    await page.goto("/");
    await expectSteps(page, SPREAD);
  });

  test("every voice's outward arrow shows without a hover", async ({ page }) => {
    await page.goto("/");
    await scrollTo(page, "[data-end]", 400);
    await expect(arrow(page, "Andrej Karpathy")).toHaveCSS("opacity", "1");
  });

  test("the PLUS card's buttons sit under its text, with nothing over the screenshot", async ({ page }) => {
    await page.goto("/");
    await scrollTo(page, "[data-end]", 100);
    const blueprint = section(page).getByRole("link", { name: "See the PLUS blueprint" });
    await expect(blueprint).toHaveCount(1);
    await expect(blueprint).toBeVisible();
    const button = await blueprint.boundingBox();
    const body = await section(page).getByText(/A tutoring program/).boundingBox();
    expect(button!.y).toBeGreaterThan(body!.y + body!.height);
    expect(button!.x).toBeLessThan(body!.x + body!.width);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the timeline is skipped and the PLUS card follows the results directly", async ({ page }) => {
    await page.goto("/");
    await expect(section(page).getByRole("heading", { name: "Ideas we build on." })).toBeHidden();
    await expect(section(page).locator("[data-voice]").first()).toBeHidden();
    await expect(plus(page)).toBeVisible();
    await expect(section(page).getByRole("link", { name: "Case study coming soon" })).toBeVisible();

    const results = await page.locator("#proof").boundingBox();
    const card = await page.locator("#ideas [data-end]").boundingBox();
    // The card starts where the results section ends: no heading, no rule.
    expect(card!.y - (results!.y + results!.height)).toBe(0);
    await expect(section(page)).toHaveCSS("border-top-width", "0px");
    await expect(page.locator("#ideas [data-end]")).toHaveCSS("opacity", "1");
  });
});

test("with reduced motion the whole timeline is drawn from the start", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await scrollTo(page, "#ideas h2", 900);
  await expect(voice(page, "Birgitta Böckeler")).toHaveCSS("opacity", "1");
  await expect(page.locator("#ideas [data-end]")).toHaveCSS("opacity", "1");
  // A voice's outward arrow appears without easing in.
  await expect(arrow(page, "Birgitta Böckeler")).toHaveCSS("transition-property", "none");
});

test("with reduced motion the co-author stack is spread from the start", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expectSteps(page, SPREAD);
  await voice(page, "Andy Polaine").hover();
  expect(await stackDiscs(page).evaluateAll((discs) => discs.flatMap((disc) => disc.getAnimations()).length)).toBe(0);
});
