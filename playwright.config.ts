import { defineConfig, devices } from '@playwright/test';

const useProductionPreview = process.env.PLAYWRIGHT_PREVIEW === '1';
const previewUrl = useProductionPreview ? 'http://localhost:4173' : 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts', '**/*.spec.mjs'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['github']],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: previewUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'], hasTouch: true },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'], hasTouch: true },
    },
    {
      name: 'Tablet Touch',
      use: { ...devices['iPad Pro'], hasTouch: true },
    },
    {
      name: 'Reduced Motion',
      use: {
        ...devices['Desktop Chrome'],
        reducedMotion: 'reduce',
      },
    },
  ],

  webServer: {
    command: useProductionPreview ? 'pnpm preview' : 'pnpm dev',
    url: previewUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
