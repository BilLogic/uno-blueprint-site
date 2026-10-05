import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";
import { structure } from "../content/structure";
import { scrollToStep } from "./walkthrough-scroll";

/** The contrast of `label`'s text against its own background, which must be opaque. */
const contrast = (label: Locator) =>
  label.evaluate((el) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const rgb = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const luminance = (channels: number[]) => {
      const [r, g, b] = channels.map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const style = getComputedStyle(el);
    const [a, b] = [luminance(rgb(style.color)), luminance(rgb(style.backgroundColor))];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });

for (const colorScheme of ["light", "dark"] as const) {
  test(`axe finds no violations in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test(`axe finds no violations in ${colorScheme} with a menu open`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: "Toggle theme" }).click();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  // The walkthrough's stage is hidden from assistive technology, so axe does not check it.
  test(`the walkthrough's faint line labels read at 4.5:1 in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Motion on: with reduced motion the walkthrough shows only its last step.
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    const section = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { level: 2, name: structure.heading.main }) });
    // At the blueprint step every line is drawn and none is the one being read.
    await scrollToStep(section, structure.steps.findIndex((step) => step.title === "Blueprint"));
    await expect(section.locator("[aria-live] b")).toHaveText("Blueprint", { timeout: 15_000 });
    for (const line of structure.board.lines) {
      expect(await contrast(section.locator("[aria-hidden]").getByText(line, { exact: true }))).toBeGreaterThanOrEqual(4.5);
    }
  });
}
