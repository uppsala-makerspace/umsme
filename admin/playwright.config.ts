import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Tests run in parallel and in any order: a test that changes data uses a
  // persona of its own (see E2E_PERSONAS in common/server/seed/scenarios/personas.js).
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 4,
  reporter: [['html', { outputFolder: '/tmp/playwright-report-admin', open: 'never' }]],
  outputDir: '/tmp/playwright-results-admin',
  use: {
    baseURL: 'http://localhost:3200',
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

  // Admin seeds its own e2e database at startup (SEED=e2e empties
  // umsme-admin-e2e and fills it from common/server/seed/scenarios/e2e.js),
  // separate from the app's, so the two suites can run at the same time.
  // Never reused, so every run starts on fresh data.
  //
  // Production mode makes the tests faster; E2E_DEV=1 runs against development
  // mode instead, with readable stack traces for debugging a failing test.
  webServer: {
    command: process.env.E2E_DEV ? 'npm run start:test:dev' : 'npm run start:test',
    url: 'http://localhost:3200',
    reuseExistingServer: false,
    timeout: 180000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
