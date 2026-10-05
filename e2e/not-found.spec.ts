import { expect, test } from "@playwright/test";

test("an unknown path gets the not-found page with the content security policy in its head", async ({ page }) => {
  const response = await page.goto("/nope/");
  expect(response?.status()).toBe(404);
  const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(policy).toMatch(/script-src 'self' 'sha256-/);
  expect(policy).not.toContain("frame-ancestors");
});
