import { expect, test } from '@playwright/test';

test('remapped keys and presentation preferences persist without changing campaign progress', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('#help-button').click();
  await page.locator('.bindings summary').click();
  const yaw = page.getByRole('button', { name: /Remap Yaw right/ });
  await yaw.click();
  await page.keyboard.press('KeyS');
  await expect(page.locator('#settings-status')).toContainText('already assigned');
  await page.keyboard.press('Digit1');
  await expect(page.getByRole('button', { name: /Remap Yaw right/ })).toHaveText('1');
  await page.locator('#audio-volume').fill('0');
  await page.locator('#subtitles').uncheck();
  await page.locator('#reduced-effects').check();
  await page.locator('#hud-scale').selectOption('1.1');
  await page.reload();
  await page.locator('#help-button').click();
  await page.locator('.bindings summary').click();
  await expect(page.getByRole('button', { name: /Remap Yaw right/ })).toHaveText('1');
  await expect(page.locator('#audio-volume')).toHaveValue('0');
  await expect(page.locator('#subtitles')).not.toBeChecked();
  await expect(page.locator('#reduced-effects')).toBeChecked();
  await expect(page.locator('#hud-scale')).toHaveValue('1.1');
  await expect(page.locator('body')).toHaveClass(/radio-subtitles-off/);
  await page.locator('#close-help').click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('#exercise').click();
  await expect(page.locator('.radio-block')).toBeHidden();
  for (const selector of ['.mission-panel', '.telemetry', '.bottom-hud']) {
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1281);
    expect(box!.y + box!.height).toBeLessThanOrEqual(721);
  }
  const heading = await page.locator('#heading').textContent();
  await page.keyboard.down('Digit1');
  await expect(page.locator('#heading')).not.toHaveText(heading!);
  await page.keyboard.up('Digit1');
  await page.keyboard.press('KeyH');
  await expect(page.locator('#manual')).toBeVisible();
  await page.locator('#reset-bindings').click();
  await expect(page.getByRole('button', { name: /Remap Yaw right/ })).toHaveText('D');
  expect(errors).toEqual([]);
});
