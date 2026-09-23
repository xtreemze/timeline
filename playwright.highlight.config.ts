import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/highlight',
  testMatch: ['**/*.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['line']],
  timeout: 90_000,
  expect: { timeout: 7_500 },
  outputDir: 'artifacts/e2e-media/playwright',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
