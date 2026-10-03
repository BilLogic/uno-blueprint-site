import { expect, test } from "@playwright/test";

test.describe("theme menu", () => {
  test("a pick of dark survives a reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(page.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("system follows the operating system again after a reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitemradio", { name: "Light" }).click();
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitemradio", { name: "System" }).click();

    await page.reload();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
    const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const followed = await background();
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    expect(followed).toBe(await background());
  });

  test("the menu works from the keyboard", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Toggle theme" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitemradio", { name: "System" })).toBeFocused();

    await page.keyboard.press("Home");
    await expect(page.getByRole("menuitemradio", { name: "Dark" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test("the menu closes when focus leaves it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.getByRole("link", { name: "Uno Blueprint on GitHub" }).focus();
    await expect(page.getByRole("menu")).toBeHidden();
  });

  test("a manual pick repoints the browser chrome colour", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    const colours = () =>
      page.locator('meta[name="theme-color"]').evaluateAll((metas) => metas.map((m) => m.getAttribute("content")));
    expect(new Set(await colours())).toEqual(new Set(["#121414"]));
    await page.reload();
    expect(new Set(await colours())).toEqual(new Set(["#121414"]));
  });
});
