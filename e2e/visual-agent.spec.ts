import { expect, test } from "@playwright/test";

// Baselines are rendered on Linux (CI, or the Playwright image locally): font
// rasterisation differs by platform, so other platforms skip unless asked.
test.skip(
  process.platform !== "linux" && !process.env.VISUAL,
  "visual baselines are Linux renders; see README § Visual snapshots",
);

const widths = [390, 1440] as const;
const schemes = ["light", "dark"] as const;

for (const width of widths) {
  for (const colorScheme of schemes) {
    test.describe(`${width} px, ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme });

      test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/");
        await page.getByRole("button", { name: "Page format" }).click();
        await page.getByRole("menuitemradio", { name: "Agent" }).click();
        await page.evaluate(() => document.fonts.ready);
      });

      test("agent view", async ({ page }) => {
        await expect(page.locator("#agent")).toHaveScreenshot(`agent-${width}-${colorScheme}.png`);
      });
    });
  }
}
