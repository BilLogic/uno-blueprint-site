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

      test("ideas timeline and the PLUS card", async ({ page }) => {
        const section = page.locator("#ideas");
        await showOnly(section);
        await section.scrollIntoViewIfNeeded();
        // The screenshot loads lazily; wait for it, and for the line laid out from the cards.
        const shot = section.getByRole("img", { name: /The PLUS blueprint/ });
        await shot.scrollIntoViewIfNeeded();
        await expect.poll(() => shot.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        if (width > 760) {
          // The end state: the whole line drawn, every node lit.
          const line = section.locator("svg path").nth(1);
          await expect(line).toHaveAttribute("d", /^M/);
          await expect.poll(() => line.evaluate((path) => getComputedStyle(path).strokeDashoffset)).toBe("0px");
          await expect(section.locator("[data-end]")).toHaveAttribute("data-on", "");
        }
        // The sticky nav would otherwise land over the section wherever the capture scrolls it.
        await page.addStyleTag({ content: "header { visibility: hidden; }" });
        await expect(section).toHaveScreenshot(`ideas-${width}-${colorScheme}.png`);
      });
    });
  }
}
