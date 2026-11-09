import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { CAMPAIGN } from '../../src/campaign';
import { Pilot } from '../helpers/pilot';

for (const difficulty of ['standard', 'assist']) {
  test(`complete all five missions sequentially in default Kestrel on ${difficulty}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    await mkdir('docs/evidence/phase-4', { recursive: true });
    await page.goto('/');
    await page.locator('#launch').click();
    const results: object[] = [];
    for (const mission of CAMPAIGN) {
      await expect(page.locator('#briefing-title')).toHaveText(mission.title.toUpperCase());
      await page.locator('#difficulty').selectOption(difficulty);
      await page.locator('#launch-mission').click();
      await expect(page.locator('#flight-status')).toHaveText('LIVE FLIGHT');
      const pilot = new Pilot(page);
      if (mission.id === 1) await pilot.flightChecks();
      const phases = new Set<string>();
      const started = Date.now();
      while (Date.now() - started < 240000) {
        const view = await pilot.read();
        if (view.state === 'COMPLETE' || view.state === 'FAILED') break;
        if (!phases.has(view.phase) && mission.id === 5 && difficulty === 'standard' && ['relays', 'engines', 'command'].includes(view.phase)) await page.screenshot({ path: `docs/evidence/phase-4/final-${view.phase}.png` });
        phases.add(view.phase);
        const navigate = mission.id > 1 && view.remaining === 0 && ['escort', 'salvage', 'extraction'].includes(view.phase);
        await pilot.step({ navigate, orbit: navigate && view.distance < 480, boost: navigate && view.distance > 900, skipOptional: true });
      }
      await pilot.stop();
      await expect(page.locator('#complete-panel'), `Mission ${mission.id}: ${[...phases].join(', ')}`).toBeVisible();
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('space.progress.v1')!));
      expect(saved.completedMissions).toEqual(CAMPAIGN.slice(0, mission.id).map((entry) => entry.id));
      expect(saved.unlockedMission).toBe(Math.min(5, mission.id + 1));
      expect(saved.selectedShip).toBe('kestrel');
      expect(Object.values(saved.parts)).toEqual([1, 1, 1, 1, 1]);
      results.push({ missionId: mission.id, title: mission.title, phases: [...phases], actualSeconds: saved.lastResult.seconds, targetMinutes: mission.targetMinutes, withinDurationTarget: saved.lastResult.seconds >= mission.targetMinutes[0] * 60 && saved.lastResult.seconds <= mission.targetMinutes[1] * 60, reward: saved.lastResult.credits });
      if (mission.id === 3) await expect(page.locator('#radio-transcript')).toContainText('Nauralis');
      if (mission.id === 4) await expect(page.locator('#radio-transcript')).toContainText('common leader');
      if (mission.id < 5) await page.locator('#next-mission').click();
    }
    await expect(page.locator('#complete-title')).toHaveText('OPERATION SECURED.');
    await expect(page.locator('#result-story')).toContainText('Vextra payload reaches Mars');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('space.progress.v1')!));
    expect(saved.campaignComplete).toBe(true);
    expect(saved.completedRuns).toHaveLength(5);
    await page.locator('#next-mission').click();
    for (const mission of CAMPAIGN) { await expect(page.locator(`#mission-${mission.id}`)).toBeEnabled(); await expect(page.locator(`#mission-${mission.id}`)).toContainText('COMPLETED'); }
    await page.locator('#campaign-close').click(); await page.reload(); await page.locator('#view-last').click();
    await expect(page.locator('#result-story')).toContainText('Reward already credited');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('space.progress.v1')!).credits)).toBe(saved.credits);
    expect(errors).toEqual([]);
    await writeFile(`docs/evidence/phase-4/campaign-${difficulty}.json`, JSON.stringify({ difficulty, ship: 'Kestrel', loadout: 'Default tier 1', results, errors, note: 'Real input-driven functional playthrough, not a human pacing study. Duration misses are recorded rather than treated as passed.' }, null, 2));
  });
}
