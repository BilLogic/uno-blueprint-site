import { expect, test } from "@playwright/test";
import { questions } from "@/content/questions";
import { site } from "@/content/site";
import { view } from "@/content/view";

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
  await expect(page).toHaveTitle(site.title);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", site.description);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${site.url}/`);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", site.share.title);
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", site.share.title);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\//);
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /.+/);
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /.+/);
});

test("the head carries the site, its source code and its questions as structured data", async ({ page }) => {
  await page.goto("/");
  const text = await page.locator('head script[type="application/ld+json"]').textContent();
  const graph: { "@type": string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[] =
    JSON.parse(text ?? "{}")["@graph"] ?? [];
  expect(graph.map((node) => node["@type"])).toEqual(["WebSite", "SoftwareSourceCode", "FAQPage"]);
  const faq = graph.find((node) => node["@type"] === "FAQPage")?.mainEntity ?? [];
  expect(faq.map((entry) => entry.name)).toEqual(questions.list.map((entry) => entry.question));
  expect(faq.every((entry) => entry.acceptedAnswer.text.length > 0 && !/[<>]/.test(entry.acceptedAnswer.text))).toBe(true);
});

test("answer engines find the whole agent guide in llms-full.txt, linked from llms.txt", async ({ request }) => {
  const full = await request.get("/llms-full.txt");
  expect(full.ok()).toBe(true);
  const text = await full.text();
  expect(text.startsWith("# Uno Blueprint\n")).toBe(true);
  for (const skill of ["ub:map", "ub:slice", "ub:audit", "ub:whatif"]) expect(text).toContain(skill);
  expect(text.trimEnd()).toBe((await (await request.get(`/${view.agentFile}`)).text()).trimEnd());
  expect(await (await request.get("/llms.txt")).text()).toContain(`${site.url}/llms-full.txt`);
});

test("crawlers find a robots file that allows them and a sitemap", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  const rules = await robots.text();
  expect(rules).not.toMatch(/Disallow: \//);
  for (const crawler of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) expect(rules).toContain(crawler);
  expect(rules).toContain(`Sitemap: ${site.url}/sitemap.xml`);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain(`<loc>${site.url}/</loc>`);
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
  const caseStudy = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Case study Coming soon" });
  await expect(caseStudy).toHaveAttribute("aria-disabled", "true");
  await expect(caseStudy).not.toHaveAttribute("href", /.*/);
  await expect(caseStudy).toHaveCSS("cursor", "not-allowed");
  await expect(page.getByRole("link", { name: "Demo", exact: true })).toHaveAttribute("href", /\/demo\/$/);
});
