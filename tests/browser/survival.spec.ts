import { expect, test } from '@playwright/test';
import { Pilot } from '../helpers/pilot';
import { mkdir } from 'node:fs/promises';

test('survival awards permanent wave credits and separate run tokens, clearing only skills on restart', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await page.goto('/');
  if (testInfo.project.name === 'chromium') {
    await mkdir('docs/evidence/survival', { recursive: true });
    await page.screenshot({ path: 'docs/evidence/survival/title-720p.png' });
  }
  await page.locator('#survival-button').click();
  await expect(page.locator('#survival-briefing')).toContainText('every tenth wave');
  await page.locator('#survival-start').click();
  await expect(page.locator('#survival-wave')).toContainText('WAVE 1');
  await expect(page.locator('#target-guide')).toHaveCSS('color', 'rgb(255, 118, 103)');
  await page.keyboard.down('ControlLeft');
  await expect(page.locator('#drive-state')).toContainText('BRAKE');
  await expect(page.locator('body')).toHaveClass(/brake-active/);
  await page.keyboard.up('ControlLeft');
  await expect(page.locator('#drive-state')).toContainText('CRUISE');
  const pilot = new Pilot(page), start = Date.now();
  while (Date.now() - start < 80000 && !await page.locator('#survival-shop').isVisible()) await pilot.step();
  await pilot.stop();
  await expect(page.locator('#survival-shop')).toBeVisible();
  // A cannon key still held at the wave boundary must not activate Continue.
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(page.locator('#survival-shop')).toBeVisible();
  await expect(page.locator('#shop-tokens')).toHaveText('2');
  await expect(page.locator('#survival-shop-summary')).toContainText('100 permanent credits');
  const saved = await page.evaluate(() => localStorage.getItem('space.progress.v1'));
  expect(JSON.parse(saved!).credits).toBe(100);
  expect(JSON.parse(saved!).unlockedMission).toBe(1);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'docs/evidence/survival/token-shop-720p.png' });
  await page.locator('#skill-focus').click();
  await expect(page.locator('#shop-tokens')).toHaveText('0');
  await expect(page.locator('#skill-focus')).toBeDisabled();
  await page.locator('#survival-next').click();
  await expect(page.locator('#survival-wave')).toContainText('WAVE 2');
  await expect(page.locator('#survival-equipped')).toContainText('Focus reactor 1');
  expect(await page.evaluate(() => localStorage.getItem('space.progress.v1'))).toBe(saved);
  await page.keyboard.press('KeyH'); await page.locator('#close-help').click(); await page.locator('#restart').click();
  await expect(page.locator('#survival-wave')).toContainText('WAVE 1');
  await expect(page.locator('#survival-tokens')).toHaveText('0');
  await expect(page.locator('#survival-equipped')).toHaveText('NO RUN SKILLS');
  await page.keyboard.press('KeyH'); await page.locator('#close-help').click(); await page.locator('#return-title').click();
  await expect(page.locator('#credits')).toHaveText('100 CR');
  expect(await page.evaluate(() => localStorage.getItem('space.progress.v1'))).toBe(saved);
});
