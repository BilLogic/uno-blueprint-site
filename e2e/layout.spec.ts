import { expect, test } from "@playwright/test";

test("nothing is wider than a 375 px screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the page loads without console errors or policy violations", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));

  await page.goto("/");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  expect(problems).toEqual([]);
});

test("the head describes the page for search and link previews", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Uno Blueprint");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\//);
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /.+/);
});

test("the page is served with the generated content security policy", async ({ page }) => {
  const response = await page.goto("/");
  const policy = response?.headers()["content-security-policy"] ?? "";
  expect(policy).toMatch(/script-src 'self'( 'sha256-[^']+')+;/);
  expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
  expect(policy).toContain("frame-ancestors 'none'");
});

test("a link that is not ready yet cannot be followed", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const caseStudy = page.getByRole("link", { name: "Case study", exact: true });
  await expect(caseStudy).toHaveAttribute("aria-disabled", "true");
  await expect(caseStudy).not.toHaveAttribute("href", /.*/);
  await expect(page.getByRole("link", { name: "Demo", exact: true })).toHaveAttribute("href", /\/demo\/$/);
});
