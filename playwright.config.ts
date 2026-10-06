import { defineConfig, devices } from "@playwright/test";

const port = 4173;

export default defineConfig({
  testDir: "e2e",
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFilePath}/{arg}-{platform}{ext}",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // No retries: a retry would pass against the baseline its own first attempt wrote.
  retries: 0,
  // A missing baseline is written from this run's render (and the test fails), so CI can hand it back.
  updateSnapshots: "missing",
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  expect: {
    toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.002 },
  },
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Tests run against the static export, never the dev server: `npm run build` first.
  webServer: {
    command: "node scripts/serve.mjs out",
    port,
    reuseExistingServer: !process.env.CI,
  },
});
