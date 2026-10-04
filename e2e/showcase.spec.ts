import { expect, test, type Page } from "@playwright/test";

const rows = [
  {
    name: "canvas",
    label: "What your team does on the canvas",
    tabs: ["Get up to speed", "Keep it current", "Tailor it"],
  },
  {
    name: "touch points",
    label: "Where agents reach the blueprint",
    tabs: ["In the app", "With your coding agent", "In your team Slack"],
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
      await expect(list.getByRole("tab", { name: row.tabs[2] })).toBeFocused();
      await expect(caption(page, row.tabs[2])).toBeVisible();

      await page.keyboard.press("ArrowRight");
      await expect(list.getByRole("tab", { name: row.tabs[0] })).toBeFocused();
      await expect(caption(page, row.tabs[0])).toBeVisible();

      await page.keyboard.press("ArrowLeft");
      await expect(caption(page, row.tabs[2])).toBeVisible();

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

test("the canvas's side link sits beside the headline, and on a phone under the sub-headline", async ({ page }) => {
  const section = page.locator("section", {
    has: page.getByRole("heading", { name: "Canvas for your team." }),
  });
  const sub = section.getByText("See how your whole service works,", { exact: false });
  const link = section.getByRole("link", { name: "Try the demo" });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  let [subBox, linkBox] = [await sub.boundingBox(), await link.boundingBox()];
  expect(linkBox!.x).toBeGreaterThan(subBox!.x + subBox!.width);

  await page.setViewportSize({ width: 390, height: 844 });
  [subBox, linkBox] = [await sub.boundingBox(), await link.boundingBox()];
  expect(linkBox!.y).toBeGreaterThanOrEqual(subBox!.y + subBox!.height);
});
