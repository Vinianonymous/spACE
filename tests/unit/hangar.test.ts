import { describe, expect, it } from 'vitest';
import { DEFAULT_LOADOUT, PARTS, SHIPS, SLOTS, buildStats, fittingIssues, initialParts, upgradePrice } from '../../src/catalog';
import { PROGRESS_KEY, ProgressStore, freshProgress, parseProgress } from '../../src/progress';
import { Flight } from '../../src/flight';
import { Systems } from '../../src/systems';

function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
function funded() {
  const local = storage(), store = new ProgressStore(local);
  for (let i = 0; i < 50; i++) store.complete(`earned-${i}`, 2000, 100);
  return { local, store };
}

describe('launch catalog and fitting', () => {
  it('has six distinct hulls, ten parts, and a free functional build for every hull', () => {
    expect(SHIPS).toHaveLength(6);
    expect(PARTS).toHaveLength(10);
    for (const slot of SLOTS) expect(PARTS.filter((part) => part.slot === slot)).toHaveLength(2);
    const signatures = new Set(SHIPS.map((ship) => `${ship.speed}/${ship.turn}/${ship.hull}/${ship.shields}`));
    expect(signatures.size).toBe(6);
    for (const ship of SHIPS) expect(fittingIssues(ship.id, DEFAULT_LOADOUT, initialParts())).toEqual([]);
  });

  it('rejects unowned parts, wrong slots, incompatible torpedoes, and excessive power', () => {
    expect(fittingIssues('kestrel', { ...DEFAULT_LOADOUT, primary: 'laser' }, initialParts()).join()).toContain('not owned');
    expect(fittingIssues('kestrel', { ...DEFAULT_LOADOUT, primary: 'missiles' }, initialParts()).join()).toContain('Invalid primary');
    const parts = Object.fromEntries(PARTS.map((part) => [part.id, 1]));
    expect(fittingIssues('viper', { ...DEFAULT_LOADOUT, secondary: 'torpedoes' }, parts).join()).toContain('incompatible');
    expect(fittingIssues('kestrel', { primary: 'laser', secondary: 'torpedoes', engine: 'vector', shield: 'reinforced', utility: 'cooling' }, parts).join()).toContain('capacity');
  });

  it('makes the first upgrade affordable immediately and Viper affordable after 2–3 minimum rewards', () => {
    expect(upgradePrice('pulse', 1)).toBeLessThanOrEqual(1500);
    const store = new ProgressStore(storage());
    store.complete('first', 1500, 100);
    store.upgradePart('pulse');
    store.complete('second', 1500, 100);
    expect(() => store.buyShip('viper')).toThrow('Insufficient');
    store.complete('third', 1500, 100);
    expect(() => store.buyShip('viper')).not.toThrow();
  });

  it('uses configured ship stats in flight and defenses rather than cosmetic-only comparisons', () => {
    const neutral = { pitch: 0, yaw: 0, roll: 0, throttle: 0, boost: false };
    const viper = new Flight(buildStats('viper')), bastion = new Flight(buildStats('bastion'));
    for (let i = 0; i < 120; i++) { viper.update({ ...neutral, throttle: 1 }, 1 / 60); bastion.update({ ...neutral, throttle: 1 }, 1 / 60); }
    expect(viper.speed).toBeGreaterThan(bastion.speed);
    expect(new Systems('standard', buildStats('bastion')).hull).toBe(160);
    expect(new Systems('standard', buildStats('specter')).shields).toBe(65);
    expect(new Flight(buildStats('peregrine')).boost).toBe(140);
  });

  it('gives every part upgrade a real effect, with different weapon and engine tradeoffs', () => {
    const parts = Object.fromEntries(PARTS.map((part) => [part.id, 1]));
    for (const part of PARTS) {
      const loadout = { ...DEFAULT_LOADOUT, [part.slot]: part.id };
      expect(buildStats('paladin', loadout, { ...parts, [part.id]: 2 })).not.toEqual(buildStats('paladin', loadout, parts));
    }
    const normal = buildStats('kestrel'), agile = buildStats('kestrel', { ...DEFAULT_LOADOUT, engine: 'vector' }, parts);
    expect(agile.topSpeed).toBeLessThan(normal.topSpeed);
    expect(agile.turnRate).toBeGreaterThan(normal.turnRate);
    const heavy = buildStats('kestrel', { ...DEFAULT_LOADOUT, secondary: 'torpedoes' }, parts);
    expect(heavy.secondaryDamage).toBeGreaterThan(normal.secondaryDamage);
    expect(heavy.secondaryTurn).toBeLessThan(normal.secondaryTurn);
    expect(new Systems('standard', heavy).ammo).toBe(8);
  });
});

describe('inventory transactions and save compatibility', () => {
  it('grants Kestrel and five default parts on a new save', () => {
    const store = new ProgressStore(storage());
    expect(store.data.ownedShips).toEqual(['kestrel']);
    expect(store.data.selectedShip).toBe('kestrel');
    expect(Object.keys(store.data.parts)).toHaveLength(5);
  });

  it('refuses insufficient funds and duplicate ship/part purchases without mutating anything', () => {
    const empty = new ProgressStore(storage()), before = empty.export();
    expect(() => empty.buyShip('viper')).toThrow('Insufficient');
    expect(empty.export()).toBe(before);
    const { store } = funded();
    store.buyShip('viper'); store.buyPart('laser');
    const balance = store.data.credits;
    expect(() => store.buyShip('viper')).toThrow('already owned');
    expect(() => store.buyPart('laser')).toThrow('already owned');
    expect(store.data.credits).toBe(balance);
  });

  it('can purchase all five alternative hulls, each immediately launchable', () => {
    const { store } = funded();
    for (const ship of SHIPS.slice(1)) {
      store.buyShip(ship.id); store.selectShip(ship.id);
      expect(fittingIssues(ship.id, store.data.loadouts[ship.id]!, store.data.parts)).toEqual([]);
    }
    expect(store.data.ownedShips).toHaveLength(6);
    expect(store.data.credits).toBe(100000 - 31000);
  });

  it('preserves per-hull loadouts and shared upgrades across swaps and reload', () => {
    const { store, local } = funded();
    store.buyShip('viper'); store.buyPart('vector');
    store.equip('kestrel', { ...DEFAULT_LOADOUT, engine: 'vector' });
    store.equip('viper', { ...DEFAULT_LOADOUT, engine: 'vector' });
    store.upgradePart('vector'); store.selectShip('viper');
    const reload = new ProgressStore(local);
    expect(reload.data.selectedShip).toBe('viper');
    expect(reload.data.loadouts.kestrel!.engine).toBe('vector');
    expect(reload.data.parts.vector).toBe(2);
    reload.restoreDefault('kestrel');
    expect(reload.data.loadouts.kestrel).toEqual(DEFAULT_LOADOUT);
    expect(reload.data.parts.vector).toBe(2);
    expect(reload.data.loadouts.viper!.engine).toBe('vector');
  });

  it('caps all ten parts at tier 3 and never charges for an invalid upgrade', () => {
    const { store } = funded();
    for (const part of PARTS) {
      if (!store.data.parts[part.id]) store.buyPart(part.id);
      store.upgradePart(part.id); store.upgradePart(part.id);
      const balance = store.data.credits;
      expect(() => store.upgradePart(part.id)).toThrow('Maximum');
      expect(store.data.credits).toBe(balance);
      expect(store.data.parts[part.id]).toBe(3);
    }
  });

  it('keeps the last valid loadout after an incompatible or over-capacity draft', () => {
    const { store } = funded();
    for (const part of PARTS) if (!store.data.parts[part.id]) store.buyPart(part.id);
    const before = store.export();
    expect(() => store.equip('kestrel', { primary: 'laser', secondary: 'torpedoes', engine: 'vector', shield: 'reinforced', utility: 'cooling' })).toThrow('capacity');
    expect(store.export()).toBe(before);
  });

  it('migrates a v1 save without changing credits, mission unlocks, or reward deduplication', () => {
    const local = storage();
    const old = { version: 1, credits: 4321, mission2Unlocked: true, completedRuns: ['old-run'], lastResult: { id: 'old-run', credits: 2000, seconds: 90 } };
    local.setItem(PROGRESS_KEY, JSON.stringify(old));
    const store = new ProgressStore(local);
    expect(store.data.version).toBe(3);
    expect(store.data.credits).toBe(4321);
    expect(store.complete('old-run', 2000, 90)).toBe(false);
    expect(store.data.lastResult).toEqual({ ...old.lastResult, missionId: 1 });
    expect(store.data.ownedShips).toEqual(['kestrel']);
    store.upgradePart('pulse');
    expect(JSON.parse(local.getItem(`${PROGRESS_KEY}.backup`)!)).toEqual(old);
  });

  it('round-trips an exported save and retains the replaced save before a confirmed import', () => {
    const { store } = funded(); store.buyShip('paladin'); store.selectShip('paladin');
    const local = storage(), target = new ProgressStore(local);
    target.complete('existing', 1500, 30);
    const original = local.getItem(PROGRESS_KEY);
    target.import(store.export());
    expect(target.data).toEqual(store.data);
    expect(local.getItem(`${PROGRESS_KEY}.before-import`)).toBe(original);
    expect(new ProgressStore(local).data).toEqual(store.data);
  });

  it('rejects malformed inventory imports without replacing current progress', () => {
    const { store } = funded(); const original = store.export();
    const bad = freshProgress(); bad.selectedShip = 'paladin';
    expect(() => store.import(JSON.stringify(bad))).toThrow('inventory');
    expect(() => store.import('not-json')).toThrow();
    expect(store.export()).toBe(original);
    expect(() => parseProgress(JSON.stringify({ ...freshProgress(), parts: { ...initialParts(), pulse: 4 } }))).toThrow();
  });

  it('does not erase credits when storage becomes unavailable during a purchase', () => {
    let denied = false;
    const local = storage();
    const store = new ProgressStore({ getItem: local.getItem, setItem(key, value) { if (denied) throw new Error('quota'); local.setItem(key, value); } });
    store.complete('run', 2000, 90); denied = true;
    store.buyPart('laser');
    expect(store.data.credits).toBe(1200);
    expect(store.data.parts.laser).toBe(1);
    expect(store.warning).toContain('Could not save');
  });
});
