import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve(process.env.SPACE_BROWSER_DIR || '/tmp/opencode/space-browsers', 'manifest.json');
const browsers = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, { executablePath: string }>;
const gpuArgs = ['--enable-gpu', '--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--ozone-platform=x11', '--no-first-run'];

export default defineConfig({
  testDir: './tests',
  testMatch: ['browser/**/*.spec.ts', 'acceptance/**/*.spec.ts'],
  timeout: 120000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: process.env.SPACE_ACCEPTANCE_REPORT || 'docs/evidence/acceptance-results.json' }]],
  use: {
    baseURL: process.env.ACCEPTANCE_URL || 'https://localhost:8443',
    // Only the local development certificate is bypassed. Public hosts must use trusted TLS.
    ignoreHTTPSErrors: !process.env.ACCEPTANCE_URL,
    // Direct GPU access without stealing desktop focus. SPACE_HEADFUL=1 is optional.
    headless: process.env.SPACE_HEADFUL !== '1',
    viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chrome-gpu', use: { browserName: 'chromium', launchOptions: { executablePath: browsers.chrome.executablePath, args: gpuArgs } } },
    { name: 'edge-gpu', use: { browserName: 'chromium', launchOptions: { executablePath: browsers.edge.executablePath, args: gpuArgs } } },
    { name: 'firefox-gpu', use: { browserName: 'firefox', launchOptions: { env: { ...process.env, MOZ_ENABLE_WAYLAND: '0' }, firefoxUserPrefs: { 'webgl.force-enabled': true, 'webgl.sanitize-unmasked-renderer': false } } } },
  ],
  webServer: process.env.ACCEPTANCE_URL ? undefined : {
    command: 'npm run serve:https',
    url: 'https://localhost:8443',
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
  },
});
