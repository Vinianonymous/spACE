import { expect, test } from '@playwright/test';

test('campaign selection locks later missions and migrates old mission-2 unlocks without losing gear', async ({ page }) => {
  await page.goto('/'); await page.locator('#campaign-button').click();
  await expect(page.locator('#mission-1')).toBeEnabled();
  for (const id of [2, 3, 4, 5]) await expect(page.locator(`#mission-${id}`)).toBeDisabled();
  await page.locator('#campaign-close').click();
  await page.locator('#open-hangar').click();
  await page.locator('#hangar-file').setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, credits: 1500, mission2Unlocked: true, completedRuns: ['old-run'] })) });
  await page.locator('#transaction-confirm').click(); await page.locator('#hangar-close').click();
  await page.locator('#campaign-button').click();
  await expect(page.locator('#mission-1')).toContainText('COMPLETED');
  await expect(page.locator('#mission-2')).toBeEnabled(); await expect(page.locator('#mission-3')).toBeDisabled();
  await page.locator('#mission-2').click(); await expect(page.locator('#briefing-title')).toHaveText('BROKEN CONVOY');
  await expect(page.locator('#briefing-prose')).toContainText('Aster');
  await page.locator('#launch-mission').click();
  await expect(page.locator('body')).toHaveAttribute('data-operation-phase', 'escort');
  await expect(page.locator('#operation-status')).toContainText('800');
  await page.keyboard.press('KeyG');
  await expect(page.locator('#guide-caption')).toContainText('ASTER');
  await page.keyboard.down('KeyC'); await expect(page.locator('#padlock-status')).toBeVisible(); await page.keyboard.up('KeyC');
  await page.keyboard.press('KeyH'); await page.locator('#close-help').click(); await page.locator('#return-title').click();
  await expect(page.locator('#credits')).toHaveText('1,500 CR');
});
