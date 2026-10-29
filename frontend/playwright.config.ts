import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 7002);
const stubPort = Number(process.env.E2E_STUB_PORT ?? 4010);
const appUrl = `http://127.0.0.1:${port}`;
const stubUrl = `http://127.0.0.1:${stubPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: appUrl,
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'node tests/e2e/stub-backend.mjs',
      url: `${stubUrl}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        STUB_PORT: String(stubPort),
      },
    },
    {
      command: `pnpm build && pnpm exec next start -p ${port}`,
      url: appUrl,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: {
        API_BASE_URL: `${stubUrl}/api/v1`,
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
