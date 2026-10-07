import { expect, test, type Page } from "@playwright/test";

const section = (page: Page) => page.locator("#ideas");
const voice = (page: Page, name: string) => section(page).getByRole("link", { name: new RegExp(name) });
const arrow = (page: Page, name: string) => voice(page, name).locator("[data-arrow]");
const plus = (page: Page) => section(page).getByRole("heading", { name: "PLUS Uno Blueprint" });

/**
 * Fixed times into the spread, not fractions of it, so a curve that reads as
 * instant fails them however long it nominally lasts: the nearest co-author is
 * still under three quarters of the way out at 120ms, and every disc is out by
 * --duration-avatar-spread (400ms) plus one --duration-stagger (70ms), with a frame or so to spare.
 */
const EARLY = 120;
const SETTLED = 400 + 70 + 30;

const stackDiscs = (page: Page) => voice(page, "Andy Polaine").locator("[data-stack] > span");

/**
 * From one disc to the next, in px, as styles/tokens.css sizes them: a disc's
 * width less a third of it at rest, and its width plus --spacing-avatar-spread
 * once spread.
 */
async function stackGeometry(page: Page) {
  const [avatar, spread] = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return ["--spacing-avatar", "--spacing-avatar-spread"].map((name) => parseFloat(root.getPropertyValue(name)));
  });
  return { rest: avatar! - avatar! / 3, spread: avatar! + spread! };
}

/** How far each co-author's disc sits from the one in front of it; the stack runs leftward from the named voice. */
const measureSteps = (discs: Element[]) =>
  discs.slice(1).map((disc, i) => discs[i]!.getBoundingClientRect().left - disc.getBoundingClientRect().left);

const stackSteps = (page: Page) => stackDiscs(page).evaluateAll(measureSteps);

/** Pauses each disc's transition the moment it starts, so a slow machine cannot run it out before it is read. */
const holdStack = (page: Page) =>
  stackDiscs(page).evaluateAll((discs) => {
    for (const disc of discs) {
      disc.addEventListener("transitionrun", () => {
        for (const animation of disc.getAnimations()) animation.pause();
      });
    }
  });

/** Once the held transitions have started, moves them to `ms` after they began and measures the stack there. */
async function stackStepsAt(page: Page, ms: number) {
  const running = () => stackDiscs(page).evaluateAll((discs) => discs.flatMap((disc) => disc.getAnimations()).length);
  await expect.poll(running).toBe(2);
  await stackDiscs(page).evaluateAll((discs, ms) => {
    for (const animation of discs.flatMap((disc) => disc.getAnimations())) {
      animation.pause();
      animation.currentTime = ms;
    }
  }, ms);
  return stackSteps(page);
}

/** Every disc sits `step` px from the one in front of it. */
async function expectSteps(page: Page, step: number) {
  for (const actual of await stackSteps(page)) expect(actual).toBeCloseTo(step, 0);
}

/** Reads the spread mid-flight and once settled, after `start` sets it going. */
async function expectSpread(page: Page, start: () => Promise<void>) {
  const { rest, spread } = await stackGeometry(page);
  await holdStack(page);
  await start();
  const [front, back] = await stackStepsAt(page, EARLY);
  // Visibly on its way, not snapped out; the last disc a beat behind.
  expect(front).toBeGreaterThan(rest);
  expect((front! - rest) / (spread - rest)).toBeLessThan(0.75);
  expect(back).toBeLessThan(front!);
  expect(await stackStepsAt(page, SETTLED)).toEqual([expect.closeTo(spread, 0), expect.closeTo(spread, 0)]);
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
    await expectSteps(page, (await stackGeometry(page)).rest);
    await expectSpread(page, () => voice(page, "Andy Polaine").hover());
  });

  test("spreading the co-author stack moves nothing else on the card", async ({ page }) => {
    await page.goto("/");
    const card = voice(page, "Andy Polaine");
    const name = card.getByText("Andy Polaine et al.");
    // Measured from the card's edge, once the card has slid in from the line.
    const layout = async () => {
      const [box, text] = [(await card.boundingBox())!, (await name.boundingBox())!];
      return { height: box.height, left: text.x - box.x };
    };
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveCSS("opacity", "1");
    await card.evaluate((node) => Promise.all(node.getAnimations().map((animation) => animation.finished)));
    const atRest = await layout();
    await card.hover();
    await finishStack(page);
    await expectSteps(page, (await stackGeometry(page)).spread);
    expect(await layout()).toEqual(atRest);
  });

  test("the co-author stack spreads when the card has keyboard focus", async ({ page }) => {
    await page.goto("/");
    await voice(page, "Andy Polaine").scrollIntoViewIfNeeded();
    await expectSpread(page, () => voice(page, "Andy Polaine").focus());
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
    await expectSteps(page, (await stackGeometry(page)).spread);
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
  await expectSteps(page, (await stackGeometry(page)).spread);
  await voice(page, "Andy Polaine").hover();
  expect(await stackDiscs(page).evaluateAll((discs) => discs.flatMap((disc) => disc.getAnimations()).length)).toBe(0);
});
