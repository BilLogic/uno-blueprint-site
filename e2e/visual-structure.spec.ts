import { expect, test } from "@playwright/test";
import { structure } from "../content/structure";
import { showOnly } from "./isolate";
import { scrollToStep } from "./walkthrough-scroll";

// Baselines are rendered on Linux (CI, or the Playwright image locally): font
// rasterisation differs by platform, so other platforms skip unless asked.
test.skip(
  process.platform !== "linux" && !process.env.VISUAL,
  "visual baselines are Linux renders; see README § Visual snapshots",
);

const widths = [390, 1440] as const;
const schemes = ["light", "dark"] as const;
const heading = `${structure.heading.lead} ${structure.heading.main}`;

for (const width of widths) {
  for (const colorScheme of schemes) {
    test.describe(`${width} px, ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme });

      test("structure walkthrough at its last step", async ({ page }) => {
        // Reduced motion shows the end state: the picked cell open in its panel.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
        const section = page
          .locator("section")
          .filter({ has: page.getByRole("heading", { level: 2, name: heading }) });
        await section.scrollIntoViewIfNeeded();
        await expect(section.locator("[aria-live] b")).toHaveText(structure.steps.at(-1)!.title);
        // The caption has finished crossfading from the opening step's.
        await expect(section.locator("[data-caption] > *")).toHaveCount(1);
        // The section is taller than the viewport, so the sticky nav would land on it mid-capture.
        await page.addStyleTag({ content: "header { visibility: hidden; }" });
        await showOnly(section);
        // The walkthrough alone: the bento after it in the section has its own snapshots.
        const walkthrough = section.locator(":scope > div > :first-child");
        await expect(walkthrough).toHaveScreenshot(`structure-${width}-${colorScheme}.png`);
      });

      test("structure walkthrough pinned on its opening step", async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
        const section = page
          .locator("section")
          .filter({ has: page.getByRole("heading", { level: 2, name: heading }) });
        await page.addStyleTag({ content: "header { visibility: hidden; }" });
        await showOnly(section);
        // Pinned, short of the point where the cards start to become the stack.
        await scrollToStep(section, 0, 0.2);
        await expect(section.locator("[aria-live] b")).toHaveText(structure.steps[0]!.title);
        await expect(page).toHaveScreenshot(`structure-context-${width}-${colorScheme}.png`);
      });

      test("structure walkthrough pinned on the flat blueprint", async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
        const section = page
          .locator("section")
          .filter({ has: page.getByRole("heading", { level: 2, name: heading }) });
        await page.addStyleTag({ content: "header { visibility: hidden; }" });
        await showOnly(section);
        // Walk to the line of visibility, one step at a time; the screenshot settles the transitions.
        await scrollToStep(section, structure.steps.findIndex((step) => step.title === "Line of visibility"));
        await expect(section.locator("[aria-live] b")).toHaveText("Line of visibility", { timeout: 30_000 });
        await expect(page).toHaveScreenshot(`structure-pinned-${width}-${colorScheme}.png`);
      });
    });
  }
}
