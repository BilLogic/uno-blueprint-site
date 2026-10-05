import { expect, test } from "@playwright/test";
import { canvas } from "@/content/canvas";
import { showcase as controls } from "@/content/showcase";
import { touchPoints } from "@/content/touch-points";
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
  // The first canvas tab insets a desktop recording on the stage as a window.
  { name: "canvas", headline: canvas.headline, tab: canvas.tabs[0].label },
  // The phone tab centres the masked phone, unzoomed: the reader asked for less motion.
  { name: "touch-points", headline: touchPoints.headline, tab: touchPoints.tabs.at(-1)!.label },
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
          // Asking for less motion, the recording stays on its poster; wait for that to be drawn.
          await section.locator("video").evaluate(
            (video: HTMLVideoElement) =>
              new Promise<void>((resolve, reject) => {
                const poster = new Image();
                poster.onload = () => resolve();
                poster.onerror = () => reject(new Error(`no poster at ${video.poster}`));
                poster.src = video.poster;
              }),
          );
          // Play shows only under the pointer; parked off the stage, it is hidden.
          await page.mouse.move(0, 0);
          await expect(section.getByRole("button", { name: controls.play }).locator("..")).toHaveCSS("opacity", "0");
          // A section taller than the screen would have the sticky nav drawn over its top.
          await page.locator("header").evaluate((nav) => (nav.style.visibility = "hidden"));
          await expect(section).toHaveScreenshot(`${showcase.name}-${width}-${colorScheme}.png`);
        });
      }
    });
  }
}
