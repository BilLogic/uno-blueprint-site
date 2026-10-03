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
/** Each showcase, by its headline, with the tab its snapshot shows. */
const showcases = [
  // The first canvas tab shows the whole board, and on a phone its cells as bars.
  { name: "canvas", headline: "Canvas for your team.", tab: "Understand the service" },
  // The coding agent tab shows every kind of marked cell and the terminal.
  { name: "touch-points", headline: "Every place you work.", tab: "With your coding agent" },
] as const;

for (const width of widths) {
  for (const colorScheme of schemes) {
    test.describe(`${width} px, ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme });

      test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
      });

      for (const showcase of showcases) {
        test(showcase.name, async ({ page }) => {
          const section = page.locator("section", {
            has: page.getByRole("heading", { name: showcase.headline }),
          });
          await showOnly(section);
          await section.getByRole("tab", { name: showcase.tab }).click();
          // A section taller than the screen would have the sticky nav drawn over its top.
          await page.locator("header").evaluate((nav) => (nav.style.visibility = "hidden"));
          await expect(section).toHaveScreenshot(`${showcase.name}-${width}-${colorScheme}.png`);
        });
      }
    });
  }
}
