import { describe, expect, it } from 'vitest';
import { DEFAULT_STATS } from '../../src/catalog';
import { SKILLS, Survival, survivalCredits, survivalStats } from '../../src/survival';

function clearOrdinaryWave(run: Survival) { run.drain(); run.update(0.1, 0, false, 0); }
describe('wave survival run state', () => {
  it('starts a fresh run with no tokens or skills and three enemies', () => {
    const run = new Survival();
    expect(run.wave).toBe(1); expect(run.tokens).toBe(0);
    expect(Object.values(run.skills)).toEqual([0, 0, 0, 0, 0, 0]);
    const spawn = run.drain().find((event) => event.type === 'spawn');
    expect(spawn?.type === 'spawn' && spawn.actors.length).toBe(3);
  });

  it('awards tokens once per cleared wave, and only permits purchases during intermission', () => {
    const run = new Survival();
    expect(() => run.buy('arc')).toThrow('between waves');
    clearOrdinaryWave(run);
    expect(run.phase).toBe('intermission'); expect(run.tokens).toBe(2);
    expect(run.drain()).toContainEqual({ type: 'intermission', earned: 2, credits: 100 });
    run.update(100, 0, false, 0); expect(run.tokens).toBe(2);
    run.buy('arc'); expect(run.skills.arc).toBe(1); expect(run.tokens).toBe(0);
    expect(() => run.buy('arc')).toThrow('Insufficient');
    expect(run.skills.arc).toBe(1); expect(run.tokens).toBe(0);
    run.next(); expect(run.wave).toBe(2); expect(run.skills.arc).toBe(1);
  });
  it('grants bounded, larger permanent credit payouts only on completed waves', () => {
    expect(survivalCredits(1)).toBe(100);
    expect(survivalCredits(10)).toBe(975);
    expect(survivalCredits(100)).toBe(1800);
    const run = new Survival();
    run.drain(); run.update(30, 1, false, 1);
    expect(run.drain()).toEqual([]);
    clearOrdinaryWave(run);
    expect(run.drain()).toContainEqual({ type: 'intermission', earned: 2, credits: 100 });
    run.update(10, 0, false, 0);
    expect(run.drain()).toEqual([]);
  });

  it('allows saving tokens for later waves without purchasing', () => {
    const run = new Survival();
    clearOrdinaryWave(run); run.next(); clearOrdinaryWave(run);
    expect(run.tokens).toBe(4);
    run.buy('focus'); expect(run.tokens).toBe(2);
    expect(run.price('focus')).toBe(3);
  });

  it('adds a summoner after the regular contacts of every tenth wave, including wave 20', () => {
    const run = new Survival();
    for (let wave = 1; wave <= 20; wave++) {
      clearOrdinaryWave(run);
      if (wave % 10 === 0) {
        expect(run.phase).toBe('boss'); expect(run.cleared).toBe(wave - 1);
        const events = run.drain();
        expect(events.some((event) => event.type === 'boss')).toBe(true);
        expect(events.some((event) => event.type === 'spawn' && event.actors.some((actor) => actor.kind === 'boss'))).toBe(true);
        run.update(8, 1, true, 1);
        const summoned = run.drain().find((event) => event.type === 'spawn' && event.summon);
        expect(summoned?.type === 'spawn' && summoned.actors.length).toBe(2);
        run.update(20, 2, false, 2); // Boss dead, reinforcements still alive.
        expect(run.phase).toBe('boss');
        expect(run.drain().some((event) => event.type === 'spawn')).toBe(false);
        run.update(0.1, 0, false, 0);
        expect(run.phase).toBe('intermission');
      }
      expect(run.cleared).toBe(wave);
      if (wave < 20) run.next();
    }
    expect(run.tokens).toBe(18 * 2 + 2 * 6);
  });

  it('caps reinforcement pressure and stops all rewards/summons after the run ends', () => {
    const run = new Survival();
    for (let i = 1; i < 10; i++) { clearOrdinaryWave(run); run.next(); }
    clearOrdinaryWave(run); run.drain();
    run.update(20, 20, true, 20);
    expect(run.drain()).toEqual([]);
    run.update(0.1, 17, true, 17);
    expect(run.drain().some((event) => event.type === 'spawn')).toBe(true);
    run.end(); run.update(100, 0, false, 0);
    expect(run.phase).toBe('ended'); expect(run.drain()).toEqual([]);
    expect(run.tokens).toBe(0);
  });

  it('caps skills at rank three and applies buffs without mutating the saved base build', () => {
    const run = new Survival(); clearOrdinaryWave(run); run.tokens = 100;
    for (const skill of SKILLS) {
      run.buy(skill.id); run.buy(skill.id); run.buy(skill.id);
      const before = run.tokens;
      expect(() => run.buy(skill.id)).toThrow('Maximum');
      expect(run.tokens).toBe(before);
    }
    const original = JSON.stringify(DEFAULT_STATS);
    const modified = survivalStats(DEFAULT_STATS, run);
    expect(modified.cooling).toBeCloseTo(DEFAULT_STATS.cooling * 1.75);
    expect(modified.lockSpeed).toBeCloseTo(DEFAULT_STATS.lockSpeed * 1.6);
    expect(modified.focusCooldown).toBe(15);
    expect(JSON.stringify(DEFAULT_STATS)).toBe(original);
    run.end();
    expect(Object.values(run.skills)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(survivalStats(DEFAULT_STATS, new Survival())).toEqual(DEFAULT_STATS);
  });
});
