import { describe, expect, it } from 'vitest';
import { Systems } from '../../src/systems';

describe('combat systems', () => {
  it('absorbs damage with shields, applies overflow to hull, and delays shield recharge', () => {
    const systems = new Systems();
    systems.damage(120);
    expect(systems.shields).toBe(0);
    expect(systems.hull).toBe(80);
    systems.update(4);
    expect(systems.shields).toBe(0);
    systems.update(1);
    expect(systems.shields).toBeGreaterThan(0);
    expect(systems.hull).toBe(80);
  });
  it('halves incoming damage on Assist', () => {
    const systems = new Systems('assist');
    systems.damage(100);
    expect(systems.shields).toBe(50);
  });
  it('reports destruction without allowing negative hull', () => {
    const systems = new Systems();
    expect(systems.damage(250).destroyed).toBe(true);
    expect(systems.hull).toBe(0);
    expect(systems.shields).toBe(0);
  });
  it('overheats, refuses firing, and recovers only after sufficient cooling', () => {
    const systems = new Systems();
    for (let i = 0; i < 14; i++) systems.cannon();
    expect(systems.overheated).toBe(true);
    expect(systems.cannon()).toBe(false);
    systems.update(2);
    expect(systems.overheated).toBe(true);
    systems.update(2);
    expect(systems.cannon()).toBe(true);
  });
  it('bounds ammunition and replenishes it on a new sortie', () => {
    const systems = new Systems();
    for (let i = 0; i < 24; i++) { expect(systems.missile()).toBe(true); systems.update(3); }
    expect(systems.missile()).toBe(false);
    expect(systems.ammo).toBe(0);
    expect(new Systems().ammo).toBe(24);
  });
  it('countermeasures have a live window and recharge', () => {
    const systems = new Systems();
    expect(systems.countermeasures()).toBe(true);
    expect(systems.countermeasures()).toBe(false);
    expect(systems.flareTime).toBe(2.5);
    systems.update(8);
    expect(systems.countermeasures()).toBe(true);
  });
  it('Focus lasts five seconds and starts its 30-second cooldown afterwards', () => {
    const systems = new Systems();
    expect(systems.focus()).toBe(true);
    systems.update(4);
    expect(systems.focusTime).toBe(1);
    expect(systems.focusCooldown).toBe(0);
    systems.update(1);
    expect(systems.focusCooldown).toBe(30);
    expect(systems.focus()).toBe(false);
    systems.update(30);
    expect(systems.focus()).toBe(true);
  });
});
