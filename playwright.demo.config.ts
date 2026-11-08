import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/demo-browser',
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173/Real-Estate-Listing-Maker/',
    trace: 'retain-on-failure',
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : {}),
    },
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run demo:preview',
    url: 'http://localhost:4173/Real-Estate-Listing-Maker/',
    reuseExistingServer: false,
  },
});
