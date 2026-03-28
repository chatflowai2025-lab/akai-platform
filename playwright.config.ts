import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Includes both root e2e tests AND web app tests (critical-flows + connected-state)
  testDir: '.',
  testMatch: ['tests/**/*.spec.ts', 'apps/web/tests/**/*.spec.ts'],
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3099',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-ios',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'mobile-android',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
