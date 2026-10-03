import { expect, test } from "@playwright/test";
import { hideHumanPage } from "./isolate";

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
        // The hero picture draws its beams and projection once it has measured itself.
        await page.waitForFunction(() => document.querySelector("[role=img] polygon")?.hasAttribute("points"));
        await expect(page).toHaveScreenshot(`top-${width}-${colorScheme}.png`);
      });

      test("footer with the theme menu open", async ({ page }) => {
        // The menu opens over the page above the footer; with the page hidden,
        // no section ever shows behind it.
        await hideHumanPage(page);
        const footer = page.locator("footer");
        await footer.scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Toggle theme" }).click();
        // Clipped to the footer and its open menu.
        const menu = page.getByRole("menu");
        const boxes = [await footer.boundingBox(), await menu.boundingBox()];
        const top = Math.min(...boxes.map((b) => b!.y));
        const bottom = Math.max(...boxes.map((b) => b!.y + b!.height));
        await expect(page).toHaveScreenshot(`footer-${width}-${colorScheme}.png`, {
          clip: { x: 0, y: top, width, height: bottom - top },
        });
      });
    });
  }
}
