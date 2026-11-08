import { expect, test, type Page } from '@playwright/test';
import { Quaternion, Vector3 } from 'three';

async function flightChecks(page: Page) {
  for (const [key, confirmation] of [['KeyW', '✓ pitch'], ['KeyD', '✓ yaw'], ['KeyE', '✓ roll'], ['ShiftLeft', 'cannon']]) {
    await page.keyboard.down(key);
    if (confirmation === 'cannon') await expect(page.locator('body')).toHaveAttribute('data-mission-stage', 'cannon');
    else await expect(page.locator('#objective')).toContainText(confirmation);
    await page.keyboard.up(key);
  }
}

test('First Light runs from briefing through tutorial, raid, reward, and reload without duplicate credits', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('#launch').click();
  await expect(page.locator('#briefing-panel')).toBeVisible();
  await expect(page.locator('#briefing-title')).toHaveText('FIRST LIGHT');
  await page.locator('#launch-mission').click();
  await expect(page.locator('body')).toHaveAttribute('data-mission-stage', 'flight');
  await expect(page.locator('#squad-list')).toBeVisible();
  await flightChecks(page);
  await expect(page.locator('body')).toHaveAttribute('data-mission-stage', 'cannon');

  // Fly with ordinary keyboard input using the visible 3D guide orientation as feedback.
  // No simulation state, damage, rewards, or objectives are injected by the test.
  const held = new Set<string>();
  const visited = new Set<string>();
  const started = Date.now();
  let result = '';
  while (Date.now() - started < 140000) {
    result = await page.locator('#flight-status').textContent() || '';
    if (result === 'COMPLETE' || await page.locator('#failure-panel').isVisible()) break;
    const stage = await page.locator('body').getAttribute('data-mission-stage') || '';
    visited.add(stage);
    const keys = new Set<string>();
    if (['cannon', 'missile', 'raid'].includes(stage)) {
      const values = (await page.locator('#guide-arrow').getAttribute('data-orientation') || '0,0,0,1').split(',').map(Number);
      const q = new Quaternion(values[0], values[1], values[2], values[3]);
      const direction = new Vector3(0, 0, -1).applyQuaternion(q);
      // Convert the slightly downward-tilted chase camera's guide back to flight axes.
      direction.applyAxisAngle(new Vector3(1, 0, 0), -Math.atan2(7, 133));
      if (Math.abs(direction.x) > 0.025 || direction.z > 0) keys.add(direction.x < 0 ? 'KeyA' : 'KeyD');
      if (direction.y > 0.025) keys.add('KeyW');
      if (direction.y < -0.025) keys.add('KeyS');
      if (stage !== 'missile') keys.add('Space');
      if ((stage === 'missile' || stage === 'raid') && (await page.locator('#lock-status').textContent()) === 'LOCK CONFIRMED [M]') await page.keyboard.press('KeyM');
    }
    if (stage === 'defense' || (stage === 'raid' && await page.locator('#missile-warning').isVisible())) await page.keyboard.press('KeyX');
    if (stage === 'focus' && (await page.locator('#focus-state').textContent()) === 'READY') await page.keyboard.press('KeyV');
    for (const key of held) if (!keys.has(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of keys) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
    await page.waitForTimeout(80);
  }
  for (const key of held) await page.keyboard.up(key);
  await expect(page.locator('#complete-panel')).toBeVisible();
  expect([...visited]).toEqual(expect.arrayContaining(['cannon', 'missile', 'defense', 'focus', 'raid']));
  await expect(page.locator('#kills')).toHaveText('08');
  await expect(page.locator('#result-reward')).toContainText('CR');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('space.progress.v1')!));
  expect(saved.credits).toBeGreaterThanOrEqual(1500);
  expect(saved.credits).toBeLessThanOrEqual(2000);
  expect(saved.completedRuns).toHaveLength(1);
  expect(saved.mission2Unlocked).toBe(true);
  await page.reload();
  await expect(page.locator('#credits')).toHaveText(`${saved.credits.toLocaleString()} CR`);
  await page.locator('#view-last').click();
  await expect(page.locator('#result-story')).toContainText('Reward already credited');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('space.progress.v1')!).credits)).toBe(saved.credits);
  expect(errors).toEqual([]);
});

test('Assist selection, restart, abandon, and storage-denied warning', async ({ page }) => {
  await page.goto('/');
  await page.locator('#launch').click();
  await page.locator('#difficulty').selectOption('assist');
  await page.locator('#launch-mission').click();
  await flightChecks(page);
  await expect(page.locator('body')).toHaveAttribute('data-mission-stage', 'cannon');
  await page.keyboard.press('KeyH');
  await page.locator('#close-help').click();
  await page.locator('#restart').click();
  await expect(page.locator('body')).toHaveAttribute('data-mission-stage', 'flight');
  await expect(page.locator('#ammo')).toHaveText('24');
  await page.keyboard.press('KeyH');
  await page.locator('#close-help').click();
  await page.locator('#return-title').click();
  await expect(page.locator('#credits')).toHaveText('0 CR');
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage denied', 'SecurityError'); } });
  });
  await page.reload();
  await expect(page.locator('#save-status')).toContainText('Storage unavailable');
  await expect(page.locator('#fatal')).toBeHidden();
});
