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

      test.beforeEach(async ({ page }) => {
        // Reduced motion: every panel in place, every picture at rest.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
        // The sticky nav would sit over the panels in a screenshot taller than the screen.
        await page.addStyleTag({ content: "body > header { visibility: hidden }" });
      });

      test("bento", async ({ page }) => {
        const duo = page.getByRole("group", { name: "Uno map, duo users" });
        const section = page.locator("section").filter({ has: duo });
        await showOnly(duo);
        await expect(section).toHaveScreenshot(`bento-${width}-${colorScheme}.png`);
      });
    });
  }
}
