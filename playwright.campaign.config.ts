import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/campaign', timeout: 600000, expect: { timeout: 10000 }, workers: 1,
  use: { browserName: 'firefox', headless: true, baseURL: 'http://127.0.0.1:5173', viewport: { width: 1280, height: 720 }, screenshot: 'only-on-failure', launchOptions: { firefoxUserPrefs: { 'webgl.force-enabled': true } } },
  outputDir: 'test-results-campaign',
  webServer: { command: 'npm run dev -- --port 5173', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
});
