import { expect, type Page } from '@playwright/test';

/** Test pilot reads public HUD telemetry and uses ordinary keys. It never injects game state. */
export class Pilot {
  private held = new Set<string>();
  constructor(readonly page: Page) {}

  async stop() { for (const key of this.held) await this.page.keyboard.up(key); this.held.clear(); }

  async flightChecks() {
    for (const [key, marker] of [['KeyW', '✓ pitch'], ['KeyD', '✓ yaw'], ['KeyE', '✓ roll'], ['ShiftLeft', 'cannon']]) {
      await this.page.keyboard.down(key);
      if (marker === 'cannon') await expect(this.page.locator('body')).toHaveAttribute('data-mission-stage', 'cannon');
      else await expect(this.page.locator('#objective')).toContainText(marker);
      await this.page.keyboard.up(key);
    }
  }

  async read() {
    return this.page.evaluate(() => {
      const el = (id: string) => document.getElementById(id)!;
      return {
        state: el('flight-status').textContent || '', phase: document.body.dataset.missionStage || '', mode: document.body.dataset.mode,
        bearing: (el('target-guide').dataset.flightBearing || '0,0,-1').split(',').map(Number),
        kind: el('target-guide').dataset.kind, requiredTarget: el('target-guide').dataset.required !== 'false',
        remaining: Number(el('operation-panel').dataset.required || 0), distance: Number(el('operation-panel').dataset.distance || 0),
        lock: el('lock-status').textContent, focus: el('focus-state').textContent, flares: el('flare-state').textContent,
        warning: !el('missile-warning').hidden, boss: !el('boss-status').hidden,
        summons: Number(el('boss-status').dataset.summons || 0), wave: Number(document.body.dataset.wave || 0),
      };
    });
  }

  async step(options: { shoot?: boolean; navigate?: boolean; orbit?: boolean; boost?: boolean; skipOptional?: boolean } = {}) {
    const view = await this.read();
    const keys = new Set<string>(['KeyF']);
    if (view.phase === 'defense') await this.page.keyboard.press('KeyX');
    else if (view.phase === 'focus') { if (view.focus === 'READY') await this.page.keyboard.press('KeyV'); }
    else {
      if (options.navigate && view.kind !== 'objective') await this.page.keyboard.press('KeyG');
      else if (!options.navigate && (view.kind === 'objective' || options.skipOptional && !view.requiredTarget)) await this.page.keyboard.press('Tab');
      else {
        const [x, y, z] = view.bearing;
        if (options.orbit) keys.add('KeyD');
        else {
          if (Math.abs(x) > 0.045 || z > 0) keys.add(x < 0 ? 'KeyA' : 'KeyD');
          if (y > 0.045) keys.add('KeyW');
          if (y < -0.045) keys.add('KeyS');
        }
        if (options.boost && z < -0.8 && Math.abs(x) < 0.2 && Math.abs(y) < 0.2) { keys.delete('KeyF'); keys.add('KeyR'); keys.add('ShiftLeft'); }
        if (options.shoot !== false && !options.navigate && view.phase !== 'missile' && z < -0.95 && Math.abs(x) < 0.12 && Math.abs(y) < 0.12) keys.add('Space');
        if (options.shoot !== false && !options.navigate && view.phase !== 'cannon' && view.lock === 'LOCK CONFIRMED [M]') await this.page.keyboard.press('KeyM');
        if (options.shoot !== false && !['cannon', 'missile', 'flight'].includes(view.phase) && view.focus === 'READY') await this.page.keyboard.press('KeyV');
      }
    }
    if (view.warning && view.flares === 'READY') await this.page.keyboard.press('KeyX');
    for (const key of [...this.held]) if (!keys.has(key)) { await this.page.keyboard.up(key); this.held.delete(key); }
    for (const key of keys) if (!this.held.has(key)) { await this.page.keyboard.down(key); this.held.add(key); }
    await this.page.waitForTimeout(65);
    return view;
  }
}
