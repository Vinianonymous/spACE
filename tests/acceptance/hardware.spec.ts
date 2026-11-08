import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, totalmem, release } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

test('production HTTPS headers and missing-asset handling', async ({ request, page }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/html');
  expect(response.headers()['content-security-policy']).toContain("script-src 'self'");
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect((await request.get('/missing.js')).status()).toBe(404);
  expect((await request.post('/')).status()).toBe(405);
  await page.goto('/');
  expect(await page.evaluate(() => isSecureContext)).toBe(true);
  expect(new URL(page.url()).protocol).toBe('https:');
});

test('60-second real-GPU Medium combat benchmark at 1080p', async ({ page, browser, browserName }, testInfo) => {
  await mkdir('docs/evidence', { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#fatal')).toBeHidden();
  const renderer = await page.locator('#viewport').evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2')!;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  });
  expect(renderer).toMatch(/Intel|AMD|NVIDIA|Apple/i);
  expect(renderer).not.toMatch(/SwiftShader|llvmpipe|softpipe|Software/i);
  await page.locator('#exercise').click();
  await page.waitForTimeout(3000);
  await page.keyboard.press('KeyH');
  await page.locator('#reset-benchmark').click();
  await page.locator('#close-help').click();
  await page.locator('#resume').click();
  await page.keyboard.down('Space');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(20000);
  await page.keyboard.down('KeyE');
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyE');
  await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(39000);
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyD');
  await expect(page.locator('#flight-status')).toHaveText('LIVE FLIGHT');
  await page.screenshot({ path: `docs/evidence/${testInfo.project.name}-flight-1080.png` });
  await page.keyboard.press('KeyH');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-report').click();
  const download = await downloadPromise;
  const file = `docs/evidence/${testInfo.project.name}-benchmark.json`;
  await download.saveAs(file);
  const report = JSON.parse(await readFile(file, 'utf8'));
  const host = {
    cpu: cpus()[0].model,
    memoryGiB: Number((totalmem() / 2 ** 30).toFixed(2)),
    os: (await readFile('/etc/os-release', 'utf8')).split('\n').find((line) => line.startsWith('PRETTY_NAME=')),
    kernel: release(),
    driver: execFileSync('glxinfo', ['-B'], { encoding: 'utf8' }),
    browser: await browser.version(),
    browserName,
    buildIndexSha256: createHash('sha256').update(await readFile('dist/index.html')).digest('hex'),
    url: page.url(),
    renderer,
    hardwareAccelerated: true,
    scenario: '60 seconds continuous cannon fire and yaw orbit, 1.5 seconds roll+boost; eight initial moving drones; no video recording during measurement',
    tls: 'Local self-signed certificate; test context explicitly bypasses certificate trust errors. HTTPS functionality is verified, public trust is not claimed.',
    runtimeErrors: errors,
  };
  await writeFile(`docs/evidence/${testInfo.project.name}-environment.json`, JSON.stringify(host, null, 2));
  expect(errors).toEqual([]);
  expect(report.preset).toBe('medium');
  expect(report.display).toContain('1920x1080');
  expect(report.activeSeconds).toBeGreaterThanOrEqual(59);
  expect(report.sampleCount).toBeGreaterThan(1000);
  // 60Hz displays can report 59.9 due to timer quantization. Report precision is 0.1 FPS.
  expect(report.medianFps).toBeGreaterThanOrEqual(60);
});
