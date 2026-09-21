import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: ['pages-runtime.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['github']],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173/timeline/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Pages Mobile Chrome',
      use: { ...devices['Pixel 5'], hasTouch: true },
    },
    {
      name: 'Pages Mobile Safari',
      use: { ...devices['iPhone 12'], hasTouch: true },
    },
  ],
  webServer: {
    command: 'node scripts/serve-pages-preview.mjs',
    url: 'http://127.0.0.1:4173/timeline/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
