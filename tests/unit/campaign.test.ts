import { describe, expect, it } from 'vitest';
import { CAMPAIGN, Operation, missionReward } from '../../src/campaign';
import { ProgressStore, freshProgress, parseProgress } from '../../src/progress';

describe('campaign objective director', () => {
  it('defines five complete briefings, debriefs, and bounded reward budgets', () => {
    expect(CAMPAIGN).toHaveLength(5);
    for (const mission of CAMPAIGN) {
      expect(mission.objectives.length).toBeGreaterThanOrEqual(3);
      expect(mission.debrief.length).toBeGreaterThan(80);
      expect(missionReward(mission.id, 1, true)).toBeLessThanOrEqual(mission.baseReward + 500);
      expect(missionReward(mission.id, 0, false)).toBe(mission.baseReward);
    }
  });
  it('requires arrival and all three ambushes, while the optional cache cannot block success', () => {
    const op = new Operation(2); op.drain();
    op.update(80, 3, 0); expect(op.phase).toBe('escort');
    op.update(0.1, 0, 0); expect(op.wave).toBe(1);
    expect(op.drain().some((event) => event.type === 'spawn')).toBe(true);
    op.update(0.1, 0, 0); expect(op.wave).toBe(2);
    op.update(0.1, 0, 0); expect(op.phase).toBe('complete');
    expect(op.optionalComplete).toBe(false);
    expect(op.drain().filter((event) => event.type === 'complete')).toHaveLength(1);
  });
  it('fails immediately when a protected objective is lost and never awards a success event', () => {
    for (const id of [2, 5] as const) {
      const op = new Operation(id); op.drain(); op.damageObjective(10000); op.update(100, 0, 0);
      expect(op.phase).toBe('failed'); expect(op.objectiveHealth).toBe(0);
      expect(op.drain().map((event) => event.type)).toEqual(['failed']);
    }
  });
  it('pauses recovery out of range or while contested, and preserves earned recovery', () => {
    const op = new Operation(3); op.drain();
    op.update(10, 0, 900); expect(op.recovery).toBe(0);
    op.update(10, 1, 300); expect(op.recovery).toBe(0);
    op.update(10, 0, 300); expect(op.recovery).toBe(10);
    op.update(10, 1, 900); expect(op.recovery).toBe(10);
    op.update(5, 0, 300); expect(op.wave).toBe(1);
    op.update(15, 0, 300); expect(op.wave).toBe(2);
    op.update(15, 0, 300); expect(op.phase).toBe('complete');
  });
  it('separates depot defenses from the Naurae intervention and exposed core', () => {
    const op = new Operation(4);
    expect(op.drain().some((event) => event.type === 'spawn' && event.actors.some((actor) => actor.kind === 'turret'))).toBe(true);
    op.update(1, 1, 0); expect(op.phase).toBe('depot');
    op.update(1, 0, 0); expect(op.phase).toBe('intervention');
    expect(op.drain().some((event) => event.type === 'spawn' && event.actors.some((actor) => actor.faction === 'naurae'))).toBe(true);
    op.update(1, 0, 0); expect(op.phase).toBe('complete');
  });
  it('gates the final core behind extraction, both relays, and drive banks plus escorts', () => {
    const op = new Operation(5); op.drain();
    op.update(45, 0, 0); expect(op.phase).toBe('extraction'); // Spawn second assault before advancing.
    op.update(1, 0, 0); expect(op.phase).toBe('relays');
    expect(op.protectedActive).toBe(false);
    op.damageObjective(10000); expect(op.phase).toBe('relays');
    op.update(1, 1, 0); expect(op.phase).toBe('relays');
    op.update(1, 0, 0); expect(op.phase).toBe('engines');
    op.update(1, 2, 0); expect(op.phase).toBe('engines');
    op.update(1, 0, 0); expect(op.phase).toBe('command');
    const events = op.drain();
    expect(events.some((event) => event.type === 'spawn' && event.actors.some((actor) => actor.kind === 'core' && actor.required))).toBe(true);
    op.update(1, 0, 0); expect(op.phase).toBe('complete');
  });
});

describe('sequential campaign saves', () => {
  const storage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); } }; };
  it('unlocks all five in sequence, persists the ending, and never re-locks on replay', () => {
    const local = storage(), store = new ProgressStore(local);
    expect(() => store.complete('skip', 2000, 60, 3)).toThrow('locked');
    for (const mission of CAMPAIGN) store.complete(`mission-${mission.id}`, missionReward(mission.id, 1), 100, mission.id);
    expect(store.data.completedMissions).toEqual([1, 2, 3, 4, 5]);
    expect(store.data.campaignComplete).toBe(true);
    const balance = store.data.credits;
    expect(store.complete('mission-5', 2500, 100, 5)).toBe(false);
    expect(store.data.credits).toBe(balance);
    store.complete('replay-1', 2000, 90, 1);
    const loaded = new ProgressStore(local);
    expect(loaded.data.unlockedMission).toBe(5); expect(loaded.data.campaignComplete).toBe(true);
    expect(loaded.data.credits).toBe(balance + 2000);
  });
  it('migrates v1/v2 flags conservatively and rejects malformed unlock shortcuts', () => {
    const old = { ...freshProgress(), version: 2, mission2Unlocked: true };
    const migrated = parseProgress(JSON.stringify(old));
    expect(migrated.unlockedMission).toBe(2); expect(migrated.completedMissions).toEqual([1]);
    expect(migrated.version).toBe(3);
    expect(() => parseProgress(JSON.stringify({ ...freshProgress(), unlockedMission: 5 }))).toThrow('campaign');
  });
});
