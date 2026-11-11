import { describe, expect, it } from 'vitest';
import type { Faction } from '../../src/campaign';
import {
  EMP_CHARGE_SECONDS, EMP_COOLDOWN_SECONDS, EMP_RANGE, OVERCLOCK_FUSE_SECONDS, OVERCLOCK_RADIUS,
  overclockDamage, tickFaction, type FactionActorState,
} from '../../src/factions';

const actor = (overrides: Partial<FactionActorState> = {}): FactionActorState => ({
  faction: 'naurae', kind: 'fighter', health: 100, maxHealth: 100,
  empCooldown: 0, empCharge: 0, teleportCooldown: 10, overclock: 0, overclockCooldown: 0,
  ...overrides,
});

describe('faction combat behavior', () => {
  it('Naurae charge then release a telegraphed EMP only inside range', () => {
    const naurae = actor();
    expect(EMP_RANGE).toBe(550);
    expect(tickFaction(naurae, 1 / 60, EMP_RANGE - 10, EMP_RANGE - 10)).toBe('emp-charge');
    expect(naurae.empCharge).toBeCloseTo(EMP_CHARGE_SECONDS);
    expect(tickFaction(naurae, EMP_CHARGE_SECONDS, EMP_RANGE - 10, EMP_RANGE - 10)).toBe('emp-blast');
    expect(naurae.empCooldown).toBeCloseTo(EMP_COOLDOWN_SECONDS);

    const far = actor();
    expect(tickFaction(far, 1 / 60, EMP_RANGE + 1, EMP_RANGE + 1)).toBeUndefined();
    expect(far.empCharge).toBe(0);
  });

  it('an EMP charge that loses range fizzles without an event', () => {
    const naurae = actor();
    tickFaction(naurae, 1 / 60, EMP_RANGE - 10, EMP_RANGE - 10);
    expect(tickFaction(naurae, EMP_CHARGE_SECONDS, 1200, 1200)).toBeUndefined();
    expect(naurae.empCharge).toBe(0);
    expect(naurae.empCooldown).toBeCloseTo(EMP_COOLDOWN_SECONDS);
  });

  it('damaged Naurae teleport on cooldown, while healthy Naurae do not', () => {
    const damaged = actor({ health: 60, teleportCooldown: 0 });
    expect(tickFaction(damaged, 0.1, 1200, 1200)).toBe('teleport');
    expect(damaged.teleportCooldown).toBeGreaterThan(0);
    const healthy = actor({ health: 100, teleportCooldown: 0 });
    expect(tickFaction(healthy, 0.1, 1200, 1200)).toBeUndefined();
  });

  it('Trusan overclock below 35% hull, dive for one fuse, then detonate once', () => {
    const trusan = actor({ faction: 'trusan', health: 30, teleportCooldown: 0 });
    expect(tickFaction(trusan, 1 / 60, 500, 500)).toBe('overclock');
    expect(trusan.overclock).toBeCloseTo(OVERCLOCK_FUSE_SECONDS);
    expect(tickFaction(trusan, OVERCLOCK_FUSE_SECONDS, 500, 500)).toBe('detonate');
    expect(trusan.overclock).toBe(0);
    expect(tickFaction(trusan, 1, 500, 500)).toBeUndefined();
    expect(actor({ faction: 'trusan', health: 30 }).overclockCooldown).toBe(0);
  });

  it('keeps factions asymmetrical and ignores non-combat targets', () => {
    expect(tickFaction(actor({ faction: 'trusan', health: 30 }), 0.1, 100, 100)).toBe('overclock');
    expect(tickFaction(actor({ faction: 'naurae', health: 30 }), 0.1, 100, 100)).toBe('emp-charge');
    expect(tickFaction(actor({ kind: 'turret', health: 30 }), 0.1, 100, 100)).toBeUndefined();
    expect(tickFaction(actor({ kind: 'boss', health: 30 }), 0.1, 100, 100)).toBeUndefined();
  });

  it('leaves Exavius actors on the unchanged baseline path', () => {
    const exavius = actor({ faction: 'exavius' as Faction, health: 40, teleportCooldown: 0, empCooldown: 0 });
    expect(tickFaction(exavius, 0.5, 100, 100)).toBeUndefined();
    expect(exavius.empCharge).toBe(0);
    expect(exavius.overclock).toBe(0);
    expect(exavius.teleportCooldown).toBe(0);
    expect(exavius.health).toBe(40);
  });

  it('scales overclock detonation damage by proximity and caps at the blast radius', () => {
    expect(overclockDamage(0)).toBeCloseTo(42);
    expect(overclockDamage(OVERCLOCK_RADIUS / 2)).toBeGreaterThan(overclockDamage(OVERCLOCK_RADIUS));
    expect(overclockDamage(OVERCLOCK_RADIUS)).toBeGreaterThan(0);
    expect(overclockDamage(OVERCLOCK_RADIUS + 1)).toBe(0);
  });
});
