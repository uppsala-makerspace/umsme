import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Tests run in parallel and in any order: a test that changes data uses a
  // persona of its own (see E2E_PERSONAS in personas.js).
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 4,
  reporter: [['html', { outputFolder: '/tmp/playwright-report' }]],
  outputDir: '/tmp/playwright-results',
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'en-US',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Admin seeds the e2e database first (SEED=e2e empties umsme-e2e and fills it
  // from common/server/seed/scenarios/e2e.js); the app then runs against it.
  // Playwright starts these in order and waits for each.
  webServer: [
    {
      command: 'npm run seed:e2e',
      cwd: '../admin',
      url: 'http://localhost:3012',
      reuseExistingServer: false,
      timeout: 180000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run start:test',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
