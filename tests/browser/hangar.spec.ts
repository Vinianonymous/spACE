import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

// Explicit save-import fixtures exercise the public import flow, not hidden credit injection.
const fundedSave = JSON.stringify({ version: 1, credits: 40000, mission2Unlocked: true, completedRuns: ['fixture-run'], lastResult: { id: 'fixture-run', credits: 2000, seconds: 120 } });
async function chooseFile(page: Page, contents: string) {
  await page.locator('#hangar-file').setInputFiles({ name: 'test-progress.json', mimeType: 'application/json', buffer: Buffer.from(contents) });
}
async function fundThroughImport(page: Page) {
  await chooseFile(page, fundedSave);
  await expect(page.locator('#hangar-confirm')).toBeVisible();
  await page.locator('#transaction-confirm').click();
  await expect(page.locator('#hangar-credits')).toHaveText('40,000 CR');
}
async function confirm(page: Page) {
  await expect(page.locator('#hangar-confirm')).toBeVisible();
  await page.locator('#transaction-confirm').click();
  await expect(page.locator('#hangar-confirm')).toBeHidden();
}

test('new hangar grants starter/default gear and rejects unaffordable purchases', async ({ page }) => {
  await page.goto('/');
  await page.locator('#open-hangar').click();
  await expect(page.locator('#hangar')).toBeVisible();
  await expect(page.locator('.ship-card')).toHaveCount(6);
  await expect(page.locator('#hangar-ship-name')).toHaveText('KESTREL');
  await expect(page.locator('#hangar-ownership')).toHaveText('ACTIVE');
  await expect(page.locator('#fitting-power')).toHaveText('9 / 12 POWER');
  await expect(page.locator('#apply-loadout')).toBeEnabled();
  await page.locator('#ship-viper').click();
  await expect(page.locator('#hangar-ship-action')).toBeDisabled();
  await expect(page.locator('#apply-loadout')).toBeDisabled();
  await expect(page.locator('#fitting-issues')).toContainText('Purchase this hull');
  await expect(page.locator('#hangar-credits')).toHaveText('0 CR');
  await page.locator('#hangar-close').click();
  await expect(page.locator('#launch')).toBeVisible();
});

test('confirmed purchases, real stat previews, shared upgrades, and last valid loadouts survive reload', async ({ page }) => {
  await page.goto('/'); await page.locator('#open-hangar').click(); await fundThroughImport(page);
  await page.locator('#ship-viper').click();
  await page.locator('#hangar-ship-action').click();
  await expect(page.locator('#transaction-summary')).toContainText('3,000 CR');
  await page.locator('#transaction-cancel').click();
  await expect(page.locator('#hangar-credits')).toHaveText('40,000 CR');
  await page.locator('#hangar-ship-action').click(); await confirm(page);
  await page.locator('#hangar-ship-action').click();
  await expect(page.locator('#hangar-ownership')).toHaveText('ACTIVE');
  await page.locator('#part-primary').selectOption('laser');
  await expect(page.locator('#apply-loadout')).toBeDisabled();
  await page.locator('#part-action-primary').click(); await confirm(page);
  await expect(page.locator('#part-primary')).toHaveValue('laser');
  await page.locator('#apply-loadout').click();
  await page.locator('#part-action-primary').click();
  await expect(page.locator('.upgrade-comparison')).toContainText('Primary damage');
  await confirm(page);
  await expect(page.locator('#hangar-credits')).toHaveText('35,300 CR');
  await page.locator('#part-engine').selectOption('vector');
  await page.locator('#part-action-engine').click(); await confirm(page);
  await expect(page.locator('#fitting-issues')).toContainText('capacity');
  await expect(page.locator('#apply-loadout')).toBeDisabled();
  await page.locator('#hangar-close').click();
  await page.reload();
  await expect(page.locator('#equipped-ship')).toHaveText('EX-07 VIPER');
  await page.locator('#open-hangar').click();
  await expect(page.locator('#part-primary')).toHaveValue('laser');
  await expect(page.locator('#part-primary option:checked')).toContainText('T2');
  await expect(page.locator('#part-engine')).toHaveValue('standard');
  await page.locator('#ship-kestrel').click();
  await page.locator('#part-engine').selectOption('vector');
  await page.locator('#apply-loadout').click();
  await page.locator('#part-action-engine').click(); await confirm(page);
  await page.locator('#hangar-ship-action').click();
  await page.locator('#hangar-close').click(); await page.reload(); await page.locator('#open-hangar').click();
  await expect(page.locator('#part-engine')).toHaveValue('vector');
  await expect(page.locator('#part-engine option:checked')).toContainText('T2');
  await page.locator('#default-loadout').click();
  await expect(page.locator('#part-engine')).toHaveValue('standard');
  await page.locator('#ship-viper').click();
  await expect(page.locator('#part-primary option:checked')).toContainText('T2');
  await expect(page.locator('#part-engine')).toHaveValue('standard');
});

test('imports require confirmation, reject corrupt inventory, and export portable progress', async ({ page }) => {
  await page.goto('/'); await page.locator('#open-hangar').click();
  await chooseFile(page, fundedSave);
  await expect(page.locator('#transaction-title')).toHaveText('Replace current progress?');
  await page.locator('#transaction-cancel').click();
  await expect(page.locator('#hangar-credits')).toHaveText('0 CR');
  await fundThroughImport(page);
  await chooseFile(page, '{invalid');
  await expect(page.locator('#hangar-message')).toContainText('Import rejected');
  await expect(page.locator('#hangar-credits')).toHaveText('40,000 CR');
  const invalid = { version: 2, credits: 99, mission2Unlocked: false, completedRuns: [], ownedShips: ['kestrel'], selectedShip: 'paladin', parts: {}, loadouts: {} };
  await chooseFile(page, JSON.stringify(invalid));
  await expect(page.locator('#hangar-message')).toContainText('progress is unchanged');
  const downloaded = page.waitForEvent('download');
  await page.locator('#hangar-export').click();
  expect((await downloaded).suggestedFilename()).toBe('space-progress.json');
  await page.locator('#hangar-close').click(); await page.reload();
  await expect(page.locator('#credits')).toHaveText('40,000 CR');
});

test('all six hulls can be bought, selected, and flown with their own defenses and default weapons', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/'); await page.locator('#open-hangar').click(); await fundThroughImport(page);
  for (const [id, code, name, hull] of [
    ['kestrel', 'EX-01', 'KESTREL', 100], ['viper', 'EX-07', 'VIPER', 65], ['bastion', 'EX-12', 'BASTION', 160],
    ['specter', 'EX-16', 'SPECTER', 80], ['peregrine', 'EX-21', 'PEREGRINE', 85], ['paladin', 'EX-30', 'PALADIN', 110],
  ] as const) {
    await page.locator(`#ship-${id}`).click();
    if (id !== 'kestrel') { await page.locator('#hangar-ship-action').click(); await confirm(page); await page.locator('#hangar-ship-action').click(); }
    await page.locator('#hangar-close').click();
    await page.locator('#exercise').click();
    await expect(page.locator('#equipped-ship')).toHaveText(`${code} ${name}`);
    await expect(page.locator('#hull')).toHaveText(`${hull} / ${hull}`);
    await expect(page.locator('#ammo')).toHaveText('24');
    await expect(page.locator('#lock-status')).toHaveText('LOCK CONFIRMED [M]');
    await page.keyboard.press('KeyM'); await expect(page.locator('#kills')).toHaveText('01');
    await page.keyboard.press('KeyH'); await page.locator('#close-help').click(); await page.locator('#return-title').click();
    await page.locator('#open-hangar').click();
  }
  await expect(page.locator('#hangar-credits')).toHaveText('9,000 CR');
  await page.setViewportSize({ width: 1280, height: 720 });
  await mkdir('docs/evidence/phase-3', { recursive: true });
  await page.screenshot({ path: `docs/evidence/phase-3/hangar-${page.context().browser()!.browserType().name()}-720.png` });
  expect(errors).toEqual([]);
});

test('purchased laser, torpedoes, and reinforced shields actually change combat and restart resources', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/'); await page.locator('#open-hangar').click(); await fundThroughImport(page);
  for (const id of ['viper', 'bastion', 'specter', 'peregrine', 'paladin']) {
    await page.locator(`#ship-${id}`).click(); await page.locator('#hangar-ship-action').click(); await confirm(page);
  }
  await page.locator('#hangar-ship-action').click();
  for (const [slot, id] of [['primary', 'laser'], ['secondary', 'torpedoes'], ['shield', 'reinforced']]) {
    await page.locator(`#part-${slot}`).selectOption(id);
    await page.locator(`#part-action-${slot}`).click(); await confirm(page);
  }
  await expect(page.locator('#fitting-power')).toHaveText('15 / 16 POWER');
  await page.locator('#apply-loadout').click();
  await page.locator('#hangar-close').click(); await page.locator('#exercise').click();
  await expect(page.locator('#primary-name')).toHaveText('RAPID LASER');
  await expect(page.locator('#secondary-name')).toHaveText('HEAVY TORPEDOES');
  await expect(page.locator('#shields')).toHaveText('160 / 160');
  await expect(page.locator('#ammo')).toHaveText('8');
  await expect(page.locator('#lock-status')).toHaveText('LOCK CONFIRMED [M]');
  await page.keyboard.press('KeyM'); await expect(page.locator('#kills')).toHaveText('01');
  await expect(page.locator('#ammo')).toHaveText('7');
  await page.keyboard.press('KeyH'); await page.locator('#close-help').click(); await page.locator('#restart').click();
  await expect(page.locator('#ammo')).toHaveText('8');
  await expect(page.locator('#shields')).toHaveText('160 / 160');
  await page.keyboard.down('Space'); await expect(page.locator('#kills')).toHaveText('01'); await page.keyboard.up('Space');
});
