import { expect, test } from '@playwright/test';

const fundedSave = JSON.stringify({ version: 1, credits: 40000, mission2Unlocked: true, completedRuns: ['fixture-run'], lastResult: { id: 'fixture-run', credits: 2000, seconds: 120 } });

test('connected hull, equipment and ability nodes enforce unlocks and persist selections', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.locator('#open-hangar').click();
  await page.locator('#hangar-file').setInputFiles({ name: 'funded.json', mimeType: 'application/json', buffer: Buffer.from(fundedSave) });
  await page.locator('#transaction-confirm').click();
  await page.locator('#hangar-tree-toggle').click();
  await expect(page.locator('#hangar-tree')).toBeVisible();
  await expect(page.locator('.tree-ship')).toHaveCount(6);
  await expect(page.locator('.tree-part')).toHaveCount(30);
  await expect(page.locator('.tree-ability')).toHaveCount(4);
  await expect(page.locator('#tree-links path')).toHaveCount(6);
  await page.locator('#tree-ship-paladin').click();
  await expect(page.locator('#hangar-message')).toContainText('Requires Specter + Peregrine');
  await expect(page.locator('#hangar-credits')).toHaveText('40,000 CR');
  await page.locator('#tree-ship-viper').click();
  await expect(page.locator('#transaction-title')).toContainText('Viper');
  await page.locator('#transaction-confirm').click();
  await expect(page.locator('#tree-ship-viper')).toHaveClass(/owned/);
  await page.locator('[data-tree-part="vector"][data-tree-tier="1"]').click();
  await page.locator('#transaction-confirm').click();
  await expect(page.locator('[data-tree-part="vector"][data-tree-tier="2"]')).toHaveClass(/available/);
  await page.locator('[data-tree-ability="phoenix"]').click();
  await page.locator('#transaction-confirm').click();
  await page.locator('[data-tree-ability="phoenix"]').click();
  await expect(page.locator('[data-tree-ability="phoenix"]')).toHaveAttribute('aria-label', /EQUIPPED/);
  await page.locator('#hangar-tree-toggle').click();
  await expect(page.locator('#hangar-ability')).toContainText('PHOENIX');
  await page.locator('#hangar-close').click();
  await page.reload();
  await page.locator('#exercise').click();
  await expect(page.locator('#focus-name')).toHaveText('PHOENIX');
  await expect(page.locator('#ammo')).toHaveText('24');
  await page.keyboard.press('KeyV');
  await expect(page.locator('#notice')).toContainText('PHOENIX');
  await expect(page.locator('#ammo')).not.toHaveText('24');
  expect(errors).toEqual([]);
});

test('Poison applies a continuing shield-to-hull drain after a primary hit', async ({ page }) => {
  await page.goto('/');
  await page.locator('#open-hangar').click();
  await page.locator('#hangar-file').setInputFiles({ name: 'funded.json', mimeType: 'application/json', buffer: Buffer.from(fundedSave) });
  await page.locator('#transaction-confirm').click();
  await page.locator('#hangar-tree-toggle').click();
  await page.locator('[data-tree-part="laser"][data-tree-tier="1"]').click(); await page.locator('#transaction-confirm').click();
  await page.locator('[data-tree-ability="poison"]').click(); await page.locator('#transaction-confirm').click();
  await page.locator('[data-tree-ability="poison"]').click();
  await page.locator('#hangar-close').click();
  await page.locator('#exercise').click();
  await expect(page.locator('#focus-name')).toHaveText('POISON');
  await page.keyboard.press('KeyV');
  await page.keyboard.down('Space');
  await page.waitForTimeout(130); // A tap shorter than one frame may never fire.
  await page.keyboard.up('Space');
  await expect(page.locator('#target-range')).toContainText('TOXIN', { timeout: 7000 });
  const initial = await page.locator('#target-range').textContent();
  await expect(page.locator('#target-range')).not.toHaveText(initial!, { timeout: 5000 });
  await expect(page.locator('#target-range')).toContainText('SH 0% / HL');
});
