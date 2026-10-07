import { expect, test, type Page } from "@playwright/test";

/*
 * The nav stays on top of the page. Each section keeps its layers to itself,
 * so however far the page is scrolled, whatever sits under the nav is the nav.
 */

const widths = [1440, 390];

/** Each point across the nav, at three heights, where something else is on top, named by what is. */
async function coveredPoints(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const nav = document.querySelector("body > header");
    if (!nav) throw new Error("no sticky header on the page");
    const box = nav.getBoundingClientRect();
    const covered: string[] = [];
    for (const fy of [0.15, 0.5, 0.85]) {
      for (let x = box.left + 4; x < box.right; x += 12) {
        const y = Math.round(box.top + box.height * fy);
        const hit = document.elementFromPoint(x, y);
        if (hit && !nav.contains(hit)) {
          const name = `${hit.tagName.toLowerCase()}.${String(hit.getAttribute("class") ?? "").split(" ")[0]}`;
          covered.push(`${name} @ ${Math.round(x)},${y} scrollY ${Math.round(window.scrollY)}`);
        }
      }
    }
    return covered;
  });
}

for (const width of widths) {
  test(`nothing paints over the nav while the page scrolls at ${width} px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    // A layer that lets the pointer through still paints, so let every element take the hit.
    await page.addStyleTag({ content: "body * { pointer-events: auto !important; }" });

    const covered: string[] = [];
    for (let y = 0; y <= (await page.evaluate(() => document.documentElement.scrollHeight)); y += 40) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      covered.push(...(await coveredPoints(page)));
    }
    expect(covered).toEqual([]);
  });
}

test("tooltips and the footer's menus still sit on top of what is around them", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.addStyleTag({ content: "body * { pointer-events: auto !important; }" });

  /** What the page shows at the element's centre: "itself", or what covers it. */
  const onTop = (selector: string, index: number) =>
    page.evaluate(
      ([selector, index]) => {
        const element = document.querySelectorAll(selector)[index]!;
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        if (hit && element.contains(hit)) return "itself";
        return `${hit?.outerHTML.slice(0, 160)} over ${element.outerHTML.slice(0, 160)} at ${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}x${Math.round(box.height)} scrollY ${scrollY} of ${innerWidth}x${innerHeight}`;
      },
      [selector, index] as const,
    );

  const tooltips = page.locator('#human [role="tooltip"], body > header [role="tooltip"]');
  const count = await tooltips.count();
  let checked = 0;
  for (let i = 0; i < count; i++) {
    const tip = tooltips.nth(i);
    const trigger = tip.locator("xpath=..");
    // Some tooltips belong to a part of the page drawn only at other widths.
    if (!(await trigger.isVisible())) continue;
    checked++;
    // A hidden tooltip is layered just as a shown one is, so it is checked where it sits, unhovered.
    await tip.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    expect(await onTop('#human [role="tooltip"], body > header [role="tooltip"]', i), `tooltip ${i}`).toBe("itself");
  }
  expect(checked).toBeGreaterThan(0);

  for (const name of ["Toggle theme", "Page format"]) {
    await page.getByRole("button", { name }).click();
    const items = page.getByRole("menuitemradio");
    await expect(items.first()).toBeVisible();
    for (let i = 0; i < (await items.count()); i++) {
      expect(await onTop('[role="menuitemradio"]', i), `${name} item ${i}`).toBe("itself");
    }
    await page.keyboard.press("Escape");
    await expect(items).toHaveCount(0);
  }
});
