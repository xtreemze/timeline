import { defineConfig, devices } from "@playwright/test";

const deployedUrl = process.env.LUM_DEPLOYED_URL;
if (!deployedUrl) {
  throw new Error("LUM_DEPLOYED_URL is required for deployed Pages certification.");
}

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: ["deployed-world.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["github"]],
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: deployedUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Deployed Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Deployed Mobile Chrome",
      use: { ...devices["Pixel 5"], hasTouch: true },
    },
  ],
});
