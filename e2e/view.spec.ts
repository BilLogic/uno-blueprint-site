import { expect, test } from "@playwright/test";

const headline = "Get your human and AI teammates on the same page.";

test.describe("page format", () => {
  test("the footer menu switches to the agent view and back", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: headline })).toBeVisible();

    await page.getByRole("button", { name: "Page format" }).click();
    await page.getByRole("menuitemradio", { name: "Agent" }).click();
    await expect(page.getByRole("heading", { level: 1, name: headline })).toBeHidden();
    await expect(page.getByText("uno-blueprint.md")).toBeVisible();

    await page.getByRole("button", { name: "Page format" }).click();
    await page.getByRole("menuitemradio", { name: "Human" }).click();
    await expect(page.getByRole("heading", { level: 1, name: headline })).toBeVisible();
    await expect(page.getByText("uno-blueprint.md")).toBeHidden();
  });

  test("the nav switch and the footer menu agree", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const forAgents = page.getByRole("button", { name: "For agents" });

    await forAgents.click();
    await expect(forAgents).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Page format" }).click();
    await expect(page.getByRole("menuitemradio", { name: "Agent" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
