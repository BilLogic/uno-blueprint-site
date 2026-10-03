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
        await page.evaluate(() => document.fonts.ready);
      });

      test("nav and hero", async ({ page }) => {
        await expect(page).toHaveScreenshot(`top-${width}-${colorScheme}.png`);
      });

      test("footer with the theme menu open", async ({ page }) => {
        const footer = page.locator("footer");
        await footer.scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Toggle theme" }).click();
        await expect(page).toHaveScreenshot(`footer-${width}-${colorScheme}.png`);
      });
    });
  }
}
