import { expect, test } from '@playwright/test';
import { freshProgress } from '../../src/progress';

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

test('a completed phase-one save opens Long March and retains the existing fleet reward ledger', async ({ page }) => {
  const save = { ...freshProgress(), version: 4, mission2Unlocked: true, unlockedMission: 5,
    completedMissions: [1, 2, 3, 4, 5], campaignComplete: true, credits: 7200, completedRuns: ['phase-one-final'] };
  await page.addInitScript((value) => localStorage.setItem('space.progress.v1', value), JSON.stringify(save));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#launch')).toContainText('LONG MARCH');
  await page.locator('#campaign-button').click();
  await expect(page.locator('#mission-6')).toBeEnabled();
  await expect(page.locator('#mission-7')).toBeDisabled();
  await page.locator('#mission-6').click();
  await expect(page.locator('#briefing-title')).toHaveText('LONG MARCH');
  await page.locator('#launch-mission').click();
  await expect(page.locator('body')).toHaveAttribute('data-operation-phase', 'march');
  await expect(page.locator('#operation-status')).toContainText('WEAPON CHARGE');
  await expect(page.locator('#operation-label')).toContainText('FOUR MOTHERSHIPS');
  expect(errors).toEqual([]);
  await page.keyboard.press('Escape');
  await page.locator('#return-title').click();
  await expect(page.locator('#credits')).toHaveText('7,200 CR');
});
