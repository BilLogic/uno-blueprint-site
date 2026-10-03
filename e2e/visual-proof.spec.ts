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
        // Reduced motion draws the section in its end state, as a reader who scrolled through sees it.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
      });

      test("proof chart", async ({ page }) => {
        const section = page.locator("#proof");
        await showOnly(section);
        await section.scrollIntoViewIfNeeded();
        // Reduced motion grows every pair to full and shows its values.
        await expect(section.getByText("71%", { exact: true })).toHaveCSS("opacity", "1");

        // The sticky nav would otherwise land over the section wherever the capture scrolls it.
        await page.addStyleTag({ content: "header { visibility: hidden; }" });
        await expect(section).toHaveScreenshot(`proof-${width}-${colorScheme}.png`);
      });
    });
  }
}
