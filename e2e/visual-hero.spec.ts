import { expect, test } from "@playwright/test";
import { showOnly } from "./isolate";

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

      test("hero, with the picture settled", async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
        // The beams and the projection are drawn once the picture has measured itself.
        await page.waitForFunction(() => document.querySelector("[role=img] polygon")?.hasAttribute("points"));
        const hero = page.locator("main section").first();
        await showOnly(hero);
        await expect(hero).toHaveScreenshot(`hero-${width}-${colorScheme}.png`);
      });
    });
  }
}
