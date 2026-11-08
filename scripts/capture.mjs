import { chromium } from '@playwright/test';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Start the production preview first: npm run preview -- --port 4173
const output = resolve(process.env.CAPTURE_OUTPUT || 'docs/evidence');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: output, size: { width: 1280, height: 720 } },
    acceptDownloads: true,
    ignoreHTTPSErrors: (process.env.CAPTURE_URL || '').startsWith('https://localhost:'),
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(process.env.CAPTURE_URL || 'http://127.0.0.1:4173');
  await page.locator('#launch').waitFor();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${output}/launch-1080.png` });
  await page.locator('#exercise').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${output}/flight-1080.png` });
  await page.keyboard.press('Tab');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(2200);
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyC');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${output}/padlock-1080.png` });
  await page.keyboard.up('KeyC');
  await page.keyboard.press('KeyH');
  await page.locator('#close-help').click();
  await page.locator('#restart').click();
  await page.waitForTimeout(1500);
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(1500);
  await page.keyboard.press('KeyH');
  await page.locator('#reset-benchmark').click();
  await page.locator('#close-help').click();
  await page.locator('#resume').click();
  await page.keyboard.down('Space');
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyE');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(15000);
  await page.keyboard.up('Space');
  await page.keyboard.press('KeyH');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-report').click();
  const download = await downloadPromise;
  await download.saveAs(`${output}/software-renderer-benchmark.json`);
  await page.locator('#close-help').click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('#restart').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${output}/flight-720.png` });
  await writeFile(`${output}/capture-environment.json`, JSON.stringify({
    browser: await browser.version(),
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    errors,
    renderer: 'Forced SwiftShader for reproducible headless smoke testing; NOT reference hardware acceptance.',
  }, null, 2));
  const videoPath = await page.video().path();
  await context.close();
  await rename(videoPath, `${output}/gameplay.webm`);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Evidence written to ${output}`);
} finally {
  await browser.close();
}
