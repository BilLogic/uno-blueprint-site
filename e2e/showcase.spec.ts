import { expect, test, type Page } from "@playwright/test";
import { canvas } from "@/content/canvas";
import { touchPoints } from "@/content/touch-points";

/** A showcase's tab labels, in order: the first, the second, then the rest. */
function labels(tabs: readonly { label: string }[]): readonly [string, string, string, ...string[]] {
  const [first, second, third, ...rest] = tabs.map((tab) => tab.label);
  if (!first || !second || !third) throw new Error("a showcase has at least three tabs");
  return [first, second, third, ...rest];
}

/** The last tab's label, where End lands and ArrowLeft wraps to. */
const last = (tabs: readonly [string, ...string[]]) => tabs.at(-1)!;

const rows = [
  {
    name: "canvas",
    label: canvas.tabsLabel,
    tabs: labels(canvas.tabs),
  },
  {
    name: "touch points",
    label: touchPoints.tabsLabel,
    tabs: labels(touchPoints.tabs),
  },
] as const;

const caption = (page: Page, tab: string) =>
  page.getByRole("tabpanel", { name: tab }).getByText(`${tab}.`, { exact: true });

for (const row of rows) {
  test.describe(`the ${row.name} showcase`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

    test("is a tab row with one tab stop, and each tab names its panel", async ({ page }) => {
      const list = page.getByRole("tablist", { name: row.label });
      const tabs = list.getByRole("tab");
      await expect(tabs).toHaveText([...row.tabs]);
      await expect(list.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);

      const first = list.getByRole("tab", { name: row.tabs[0] });
      await expect(first).toHaveAttribute("aria-selected", "true");
      const panelId = await first.getAttribute("aria-controls");
      await expect(page.locator(`#${panelId}`)).toHaveRole("tabpanel");
      await expect(caption(page, row.tabs[0])).toBeVisible();
    });

    test("arrow keys, Home and End switch the panel", async ({ page }) => {
      const list = page.getByRole("tablist", { name: row.label });
      await list.getByRole("tab", { name: row.tabs[0] }).focus();

      await page.keyboard.press("ArrowRight");
      const second = list.getByRole("tab", { name: row.tabs[1] });
      await expect(second).toBeFocused();
      await expect(second).toHaveAttribute("aria-selected", "true");
      await expect(caption(page, row.tabs[1])).toBeVisible();
      await expect(caption(page, row.tabs[0])).toHaveCount(0);

      await page.keyboard.press("End");
      await expect(list.getByRole("tab", { name: last(row.tabs) })).toBeFocused();
      await expect(caption(page, last(row.tabs))).toBeVisible();

      await page.keyboard.press("ArrowRight");
      await expect(list.getByRole("tab", { name: row.tabs[0] })).toBeFocused();
      await expect(caption(page, row.tabs[0])).toBeVisible();

      await page.keyboard.press("ArrowLeft");
      await expect(caption(page, last(row.tabs))).toBeVisible();

      await page.keyboard.press("Home");
      await expect(caption(page, row.tabs[0])).toBeVisible();
    });

    test("a click switches the panel", async ({ page }) => {
      const list = page.getByRole("tablist", { name: row.label });
      await list.getByRole("tab", { name: row.tabs[1] }).click();
      await expect(caption(page, row.tabs[1])).toBeVisible();
      await expect(list.getByRole("tab", { name: row.tabs[0] })).toHaveAttribute("aria-selected", "false");
    });
  });
}

const phone = touchPoints.tabs.find((tab) => tab.value === "phone")!;

for (const width of [1440, 390]) {
  test(`at ${width} px the touch points end on the phone, every tab's stage is one size, and the handset fills it`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const list = page.getByRole("tablist", { name: touchPoints.tabsLabel });
    await expect(list.getByRole("tab")).toHaveCount(touchPoints.tabs.length);
    await expect(list.getByRole("tab").last()).toHaveText(phone.label);

    // Clicking may scroll the tab into view, so only the stage's size is compared.
    const sizes = [];
    for (const tab of touchPoints.tabs) {
      await list.getByRole("tab", { name: tab.label }).click();
      const box = await page.getByRole("tabpanel", { name: tab.label }).getByTestId("showcase-stage").boundingBox();
      sizes.push([box!.width, box!.height]);
    }
    expect(new Set(sizes.map(String)).size).toBe(1);

    const panel = page.getByRole("tabpanel", { name: phone.label });
    await expect(panel.getByText(phone.caption)).toBeVisible();
    const stage = (await panel.getByTestId("showcase-stage").boundingBox())!;
    const frame = (await panel.getByTestId("phone-frame").boundingBox())!;
    expect(frame.y).toBeGreaterThanOrEqual(stage.y);
    expect(frame.y + frame.height).toBeLessThanOrEqual(stage.y + stage.height + 0.5);
    expect(frame.x).toBeGreaterThanOrEqual(stage.x);
    expect(frame.x + frame.width).toBeLessThanOrEqual(stage.x + stage.width);
    expect(frame.height).toBeGreaterThan(stage.height * 0.75);
  });
}

test("the canvas's side link sits beside the headline, and on a phone under the sub-headline", async ({ page }) => {
  const section = page.locator("section", {
    has: page.getByRole("heading", { name: canvas.headline }),
  });
  const sub = section.getByText(canvas.subheadline, { exact: true });
  const link = section.getByRole("link", { name: canvas.more.label });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  let [subBox, linkBox] = [await sub.boundingBox(), await link.boundingBox()];
  expect(linkBox!.x).toBeGreaterThan(subBox!.x + subBox!.width);

  await page.setViewportSize({ width: 390, height: 844 });
  [subBox, linkBox] = [await sub.boundingBox(), await link.boundingBox()];
  expect(linkBox!.y).toBeGreaterThanOrEqual(subBox!.y + subBox!.height);
});
