import { describe, expect, it } from 'vitest';
import { SHIPS, PARTS, DEFAULT_LOADOUT } from '../../src/catalog';
import { missingShipRequirements, missingPartRequirements, partNodeStatus } from '../../src/tech-tree';
import { PROGRESS_KEY, ProgressStore, freshProgress, parseProgress } from '../../src/progress';
import { contactLayers, phoenixTargets } from '../../src/abilities';
import { Systems } from '../../src/systems';

function funded() {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const store = new ProgressStore(storage);
  store.complete('funded', 100000, 20);
  return { store, storage };
}

describe('connected technology tree', () => {
  it('gates fleet branches and parts in the transaction layer, not just the interface', () => {
    const { store } = funded();
    const before = store.export();
    expect(missingShipRequirements('paladin', store.data)).toEqual(['Specter', 'Peregrine']);
    expect(() => store.buyShip('paladin')).toThrow('Requires Specter + Peregrine');
    expect(() => store.buyPart('torpedoes')).toThrow('Requires Bastion');
    expect(store.export()).toBe(before);
    store.buyShip('viper'); store.buyShip('specter');
    expect(missingShipRequirements('paladin', store.data)).toEqual(['Peregrine']);
    store.buyShip('bastion'); store.buyPart('torpedoes'); store.buyShip('peregrine'); store.buyShip('paladin');
    expect(store.data.ownedShips).toHaveLength(SHIPS.length);
    expect(missingPartRequirements('cooling', store.data)).toEqual(['Rapid laser']);
    store.buyPart('laser'); store.buyPart('cooling');
    expect(store.data.parts.cooling).toBe(1);
    expect(PARTS).toHaveLength(10);
  });

  it('exposes sequential part tiers, preserves imported legacy unlocks and avoids save loss', () => {
    const { store, storage } = funded();
    expect(partNodeStatus('laser', 1, store.data)).toBe('available');
    expect(partNodeStatus('laser', 2, store.data)).toBe('locked');
    store.buyPart('laser');
    expect(partNodeStatus('laser', 1, store.data)).toBe('owned');
    expect(partNodeStatus('laser', 2, store.data)).toBe('available');
    store.upgradePart('laser');
    expect(partNodeStatus('laser', 3, store.data)).toBe('available');
    const old = { ...freshProgress(), version: 3, credits: 4000, ownedShips: ['kestrel', 'paladin'], selectedShip: 'paladin', loadouts: { kestrel: DEFAULT_LOADOUT, paladin: DEFAULT_LOADOUT }, parts: { ...freshProgress().parts, torpedoes: 2 } };
    delete (old as Record<string, unknown>).ownedAbilities;
    delete (old as Record<string, unknown>).selectedAbility;
    storage.setItem(PROGRESS_KEY, JSON.stringify(old));
    const imported = new ProgressStore(storage);
    expect(imported.data.ownedShips).toEqual(['kestrel', 'paladin']);
    expect(imported.data.parts.torpedoes).toBe(2);
    expect(imported.data.selectedAbility).toBe('focus');
    imported.upgradePart('torpedoes'); // Grandfathered equipment can still advance.
    expect(parseProgress(imported.export()).parts.torpedoes).toBe(3);
    expect(JSON.parse(storage.getItem(`${PROGRESS_KEY}.backup`)!)).toEqual(old);
  });

  it('requires researching each replacement ability and validates selected ownership', () => {
    const { store, storage } = funded();
    expect(() => store.buyAbility('phoenix')).toThrow('Requires viper');
    store.buyShip('viper'); store.buyAbility('phoenix'); store.selectAbility('phoenix');
    expect(new ProgressStore(storage).data.selectedAbility).toBe('phoenix');
    expect(() => store.selectAbility('bloodthirst')).toThrow('not owned');
    expect(() => parseProgress(JSON.stringify({ ...store.data, selectedAbility: 'poison' }))).toThrow('ability inventory');
    store.buyPart('laser'); store.buyAbility('poison');
    store.buyShip('bastion'); store.buyAbility('bloodthirst');
    expect(store.data.ownedAbilities).toHaveLength(4);
  });
});

describe('replacement ability mechanics', () => {
  it('Phoenix selects up to six distinct contacts in 1 km, consumes ammo, and starts cooldown', () => {
    const targets = phoenixTargets(Array.from({ length: 9 }, (_, index) => ({ target: index, distance: index === 8 ? 1001 : 900 - index * 100 })), 6);
    expect(targets).toHaveLength(6);
    expect(new Set(targets).size).toBe(6);
    expect(phoenixTargets([{ target: 1, distance: 1001 }], 6)).toEqual([]);
    const systems = new Systems('standard', undefined, 'phoenix');
    expect(systems.focus()).toBe(true);
    expect(systems.salvo(targets.length)).toBe(true);
    expect(systems.ammo).toBe(18);
    expect(systems.focusTime).toBe(0);
    expect(systems.focusCooldown).toBe(30);
    expect(systems.salvo(19)).toBe(false);
    expect(systems.focus()).toBe(false);
  });

  it('Bloodthirst restores missing hull before shields, only on active player kills', () => {
    const systems = new Systems('standard', undefined, 'bloodthirst');
    systems.hull = 90; systems.shields = 50;
    systems.bloodthirstKill(); expect(systems.hull).toBe(90);
    systems.focus(); systems.bloodthirstKill();
    expect(systems.hull).toBe(100); expect(systems.shields).toBe(55);
    systems.damageDelay = 10;
    systems.update(5); systems.bloodthirstKill(); expect(systems.shields).toBe(55);
  });

  it('Poison damage crosses a visible shield layer into hull without extra hit points', () => {
    expect(contactLayers(100, 100)).toMatchObject({ shields: 30, hull: 70 });
    expect(contactLayers(70, 100)).toMatchObject({ shields: 0, hull: 70 });
    expect(contactLayers(64, 100)).toMatchObject({ shields: 0, hull: 64 });
  });
});
