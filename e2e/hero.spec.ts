import { expect, test, type Page } from "@playwright/test";

const pictureName = /^Documents from Notion, Slack, Figma, GitHub, Google Drive, Zoom, email and spreadsheets/;
const picture = (page: Page) => page.getByRole("img", { name: pictureName });

test("the hero says what the toolkit is and offers two ways in", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Get your human and AI teammates on the same page." }),
  ).toBeVisible();
  await expect(
    page.getByText("An open-source toolkit for context engineering: a canvas for your team, a harness for your agents."),
  ).toBeVisible();
  const hero = page.locator("main section").first();
  await expect(hero.getByRole("link", { name: "Get the template" })).toHaveAttribute("href", "#start");
  await expect(hero.getByRole("link", { name: "Try the demo" })).toHaveAttribute("href", /\/demo\/$/);
});

test("the picture is one image with a description", async ({ page }) => {
  await page.goto("/");
  await expect(picture(page)).toBeVisible();
});

test("with reduced motion the picture shows the finished board and holds still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const image = picture(page);
  await expect(image.getByText("Built", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  // Settled once the projection into the panel is drawn.
  await expect(image.locator("polygon")).toHaveAttribute("points", /\d/);
  const before = await image.screenshot({ animations: "disabled" });
  await page.waitForTimeout(2500);
  const after = await image.screenshot({ animations: "disabled" });
  expect(after.equals(before), "the picture changed").toBe(true);
});

test("without reduced motion the picture plays", async ({ page }) => {
  await page.goto("/");
  const image = picture(page);
  await image.scrollIntoViewIfNeeded();
  const first = await image.screenshot();
  await expect.poll(async () => (await image.screenshot()).equals(first), { timeout: 6000 }).toBe(false);
});

test.describe("the panel keeps the rows its width can hold", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("all of them on a wide screen", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const image = picture(page);
    for (const label of ["Summary", "Status", "Owner", "Value proposition", "Evidence", "Follows", "Leads to"]) {
      await expect(image.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("no value proposition or next steps below 1100 px", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto("/");
    const image = picture(page);
    await expect(image.getByText("Evidence", { exact: true })).toBeVisible();
    for (const label of ["Value proposition", "Follows", "Leads to"]) {
      await expect(image.getByText(label, { exact: true })).toBeHidden();
    }
  });

  test("no image or tabs on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const image = picture(page);
    for (const label of ["Summary", "Status", "Owner"]) {
      await expect(image.getByText(label, { exact: true })).toBeVisible();
    }
    for (const label of ["Evidence", "Value proposition", "Follows"]) {
      await expect(image.getByText(label, { exact: true })).toBeHidden();
    }
  });
});

for (const width of [800, 1000, 1160]) {
  test(`at ${width} px no words in the picture run past their box`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const overflowing = await picture(page).evaluate((root) => {
      const bordered = (element: Element | null): Element | null => {
        for (let at = element; at && at !== root; at = at.parentElement) {
          const style = getComputedStyle(at);
          if (["Top", "Right", "Bottom", "Left"].some((side) => parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0)) return at;
        }
        return root;
      };
      const out: string[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const text = range.getBoundingClientRect();
        if (!text.width) continue;
        const box = bordered(node.parentElement)!.getBoundingClientRect();
        if (text.left < box.left - 0.5 || text.right > box.right + 0.5) out.push(node.textContent);
      }
      return out;
    });
    expect(overflowing).toEqual([]);
  });
}
