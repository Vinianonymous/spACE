import { expect, test } from '@playwright/test';

test('incoming missiles show red ship-relative bearings and disappear after countermeasures', async ({ page }) => {
  await page.goto('/');
  await page.locator('#survival-button').click();
  await page.locator('#survival-start').click();
  await expect(page.locator('#missile-compass')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#missile-bearings .missile-bearing').first()).toBeVisible();
  await expect(page.locator('#missile-compass')).toHaveAttribute('aria-label', /incoming missile.*ship-relative/);
  await expect(page.locator('#missile-compass')).toHaveCSS('color', 'rgb(255, 118, 103)');
  await page.keyboard.press('KeyX');
  await expect(page.locator('#missile-compass')).toBeHidden();
});
