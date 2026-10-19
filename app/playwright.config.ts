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

  // The app seeds the e2e database at startup (SEED=e2e empties umsme-e2e and
  // fills it from common/server/seed/scenarios/e2e.js). Never reused, so every
  // run starts on fresh data.
  //
  // Production mode (minified client) makes the tests about 20% faster for
  // ~2 s more startup. E2E_DEV=1 runs against development mode instead, with
  // readable stack traces in the browser for debugging a failing test.
  webServer: {
    command: process.env.E2E_DEV ? 'npm run start:test:dev' : 'npm run start:test',
    url: 'http://localhost:3002',
    reuseExistingServer: false,
    timeout: 180000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
