import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { Pilot } from '../helpers/pilot';

test('reach wave ten without injected state, observe summons, defeat boss, and lose all skills on exit', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const original = await page.evaluate(() => localStorage.getItem('space.progress.v1'));
  await page.locator('#survival-button').click(); await page.locator('#survival-start').click();
  const pilot = new Pilot(page);
  const started = Date.now();
  let observedSummons = false, upgraded = false, clearedTen = false;
  const waves: number[] = [];
  while (Date.now() - started < 540000) {
    if (await page.locator('#failure-panel').isVisible()) break;
    if (await page.locator('#survival-shop').isVisible()) {
      await pilot.stop();
      const view = await pilot.read(); waves.push(view.wave);
      if (view.wave === 10) { clearedTen = true; break; }
      for (const id of ['siphon', 'cooling', 'focus', 'arc', 'blast', 'ion']) {
        const button = page.locator(`#skill-${id}`);
        if (await button.isEnabled()) { await button.click(); upgraded = true; break; }
      }
      await page.locator('#survival-next').click();
      continue;
    }
    const view = await pilot.read();
    if (view.phase === 'boss' && !observedSummons) {
      await pilot.step({ shoot: false, orbit: true });
      if ((await pilot.read()).summons > 0) {
        observedSummons = true;
        await mkdir('docs/evidence/survival', { recursive: true });
        await page.screenshot({ path: 'docs/evidence/survival/wave-10-summoner.png' });
      }
    } else await pilot.step();
  }
  await pilot.stop();
  expect(upgraded).toBe(true);
  expect(observedSummons).toBe(true);
  expect(clearedTen).toBe(true);
  expect(waves).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  await expect(page.locator('#survival-shop-summary')).toContainText('Earned 6 run tokens');
  expect(await page.evaluate(() => localStorage.getItem('space.progress.v1'))).toBe(original);
  await page.locator('#survival-exit').click();
  await page.locator('#survival-button').click(); await page.locator('#survival-start').click();
  await expect(page.locator('#survival-wave')).toContainText('WAVE 1');
  await expect(page.locator('#survival-tokens')).toHaveText('0');
  await expect(page.locator('#survival-equipped')).toHaveText('NO RUN SKILLS');
  expect(errors).toEqual([]);
  await writeFile('docs/evidence/survival/ten-wave-playthrough.json', JSON.stringify({ waves, observedSummons, noCampaignWrites: true, resetVerified: true, errors }, null, 2));
});
