import { expect, test } from "@playwright/test";

// The tests build without Netlify's CONTEXT, as CI does, so the page must carry no analytics.
test("a build outside production loads no Clarity tag and allows none in its policy", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const response = await page.goto("/");
  await page.waitForLoadState("load");
  await page.evaluate(() => new Promise((done) => requestIdleCallback(() => done(null))));

  expect(await page.content()).not.toContain("clarity.ms");
  expect(await page.evaluate(() => "clarity" in window)).toBe(false);
  expect(requests.filter((url) => url.includes("clarity.ms"))).toEqual([]);
  expect(response?.headers()["content-security-policy"]).not.toContain("clarity.ms");
});
