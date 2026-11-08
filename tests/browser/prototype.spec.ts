import { expect, test } from '@playwright/test';

test('launch, lock a missile, fire, pause on focus loss, restart, and export timings', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#launch')).toBeVisible();
  await expect(page.locator('#fatal')).toBeHidden();
  await page.locator('#exercise').click();
  await expect(page.locator('#flight-status')).toHaveText('LIVE FLIGHT');
  await expect(page.locator('#lock-status')).toHaveText('LOCK CONFIRMED [M]');
  await page.keyboard.press('KeyM');
  await expect(page.locator('#kills')).toHaveText('01');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#pause-panel')).toBeVisible();
  await expect(page.locator('#pause-reason')).toContainText('focus lost');
  const pausedSpeed = await page.locator('#speed').textContent();
  await page.waitForTimeout(200);
  await expect(page.locator('#speed')).toHaveText(pausedSpeed!);
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-panel')).toBeHidden();
  await page.keyboard.press('KeyH');
  await expect(page.locator('#manual')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-report').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^space-benchmark-.*\.json$/);
  await page.locator('#close-help').click();
  await page.locator('#restart').click();
  await expect(page.locator('#kills')).toHaveText('00');
  await page.keyboard.down('Space');
  await expect(page.locator('#kills')).toHaveText('01');
  await page.keyboard.up('Space');
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test(`HUD and launch screen fit ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#fatal')).toBeHidden();
    for (const selector of ['.topbar', '.mission-panel', '.telemetry', '#launch', '.bottom-hud', '.statusbar']) {
      const bounds = await page.locator(selector).boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    await page.screenshot({ path: `test-results/launch-${viewport.width}.png` });
    await page.locator('#exercise').click();
    await page.screenshot({ path: `test-results/flight-${viewport.width}.png` });
  });
}

test('quality setting changes the actual render resolution', async ({ page }) => {
  await page.goto('/');
  await page.locator('#help-button').click();
  await page.locator('#quality').selectOption('low');
  expect(await page.locator('#viewport').evaluate((canvas) => (canvas as HTMLCanvasElement).height)).toBe(480);
});

test('mouse mode, sensitivity, and inversion are configurable and persistent', async ({ page }) => {
  await page.goto('/');
  await page.locator('#help-button').click();
  await expect(page.locator('#mouse-mode')).toHaveValue('relative');
  await page.locator('#mouse-mode').selectOption('position');
  await page.locator('#mouse-sensitivity').fill('1.5');
  await page.locator('#invert-pitch').check();
  await page.reload();
  await page.locator('#help-button').click();
  await expect(page.locator('#mouse-mode')).toHaveValue('position');
  await expect(page.locator('#mouse-sensitivity')).toHaveValue('1.5');
  await expect(page.locator('#invert-pitch')).toBeChecked();
  await page.locator('#mouse-mode').selectOption('relative');
  await page.locator('#close-help').click();
  await page.locator('#exercise').click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.id)).toBe('viewport');
  const before = await page.locator('#heading').textContent();
  // Exercise relative deltas without changing cursor screen coordinates.
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => document.dispatchEvent(new MouseEvent('mousemove', { movementX: 12, movementY: 0 })));
    await page.waitForTimeout(30);
  }
  await expect(page.locator('#heading')).not.toHaveText(before!);
  await page.keyboard.press('KeyH');
  await expect(page.locator('#manual')).toBeVisible();
  expect(await page.evaluate(() => document.pointerLockElement === null)).toBe(true);
});

test('center-lower target arrow shows range and hold-C padlock tracks then releases', async ({ page }) => {
  await page.goto('/');
  await page.locator('#exercise').click();
  await expect(page.locator('#target-guide')).toBeVisible();
  await expect(page.locator('#guide-distance')).toHaveText(/[\d,]+ M/);
  const box = await page.locator('#target-guide').boundingBox();
  const viewport = page.viewportSize()!;
  expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThan(2);
  expect(box!.y).toBeGreaterThan(viewport.height / 2);
  await page.keyboard.press('Tab');
  await expect(page.locator('#guide-caption')).toHaveText('DRONE 02');
  await page.keyboard.down('KeyC');
  await expect(page.locator('#padlock-status')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/padlock-view/);
  // The selected target is pulled to the center while the player retains flight control.
  await expect.poll(async () => {
    const marker = await page.locator('#target-marker').boundingBox();
    return marker ? Math.abs(marker.x + marker.width / 2 - viewport.width / 2) : Infinity;
  }).toBeLessThan(20);
  await page.keyboard.up('KeyC');
  await expect(page.locator('#padlock-status')).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/padlock-view/);
});
