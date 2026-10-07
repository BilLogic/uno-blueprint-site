import { expect, test, type Page } from "@playwright/test";

const section = (page: Page) => page.locator("#ideas");
const voice = (page: Page, name: string) => section(page).getByRole("link", { name: new RegExp(name) });
const arrow = (page: Page, name: string) => voice(page, name).locator("[data-arrow]");
const plus = (page: Page) => section(page).getByRole("heading", { name: "PLUS Uno Blueprint" });

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

  test("each voice links to where it was said, with initials in place of a portrait", async ({ page }) => {
    await page.goto("/");
    const cards = section(page).locator("[data-voice]");
    await expect(cards).toHaveCount(9);
    await expect(voice(page, "Andrej Karpathy")).toHaveAttribute("href", /gist\.github\.com\/karpathy/);
    await expect(voice(page, "G. Lynn Shostack")).toContainText("GL");
    await expect(cards.locator("img")).toHaveCount(0);
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
    // It eases in with the card's border.
    await expect(arrow(page, "Andrej Karpathy")).toHaveCSS("transition-duration", "0.2s");
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
