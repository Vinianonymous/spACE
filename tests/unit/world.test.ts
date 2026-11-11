import { describe, expect, it } from 'vitest';
import { Box3, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { createActor, createShip } from '../../src/world';
import type { Faction, TargetKind } from '../../src/campaign';

describe('batched ship geometry', () => {
  it('retains two animated engine flames and a bounded flight silhouette', () => {
    for (const enemy of [false, true]) {
      const ship = createShip(enemy);
      expect(ship.children.filter((child) => child.name === 'flame')).toHaveLength(2);
      expect(ship.children.filter((child) => child instanceof Mesh).length).toBeLessThanOrEqual(7);
      const bounds = new Box3().setFromObject(ship);
      expect(bounds.min.z).toBeLessThan(-7);
      expect(bounds.max.x).toBeGreaterThan(7);
      expect(bounds.max.z).toBeGreaterThan(7);
    }
  });
  it('joins a centered nose to the fuselage on every player hull and the enemy fighter', () => {
    for (const variant of ['kestrel', 'viper', 'bastion', 'specter', 'peregrine', 'paladin'] as const) {
      for (const enemy of [false, true]) {
        if (enemy && variant !== 'kestrel') continue;
        const ship = createShip(enemy, variant);
        const bounds = new Box3().setFromObject(ship);
        const noseTips: number[][] = [];
        ship.traverse((child) => {
          if (!(child instanceof Mesh) || child.name === 'flame') return;
          const positions = child.geometry.getAttribute('position');
          for (let i = 0; i < positions.count; i++) {
            if (Math.abs(positions.getZ(i) - bounds.min.z) < 0.001) noseTips.push([positions.getX(i), positions.getY(i)]);
          }
        });
        expect(noseTips.length).toBeGreaterThan(0);
        expect(noseTips.every(([x, y]) => Math.abs(x) < 0.001 && Math.abs(y) < 0.001)).toBe(true);
      }
    }
  });
  it('uses red for Trusan and blue for Naurae ships, installations, and transports', () => {
    for (const faction of ['trusan', 'naurae'] as Faction[]) {
      for (const kind of ['fighter', 'heavy', 'turret', 'transport', 'cache', 'core', 'relay', 'boss', 'laser'] as TargetKind[]) {
        const actor = createActor(faction, kind);
        let pieces = 0;
        actor.traverse((part) => {
          if (!(part instanceof Mesh)) return;
          const material = part.material;
          if (!(material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial)) return;
          if (faction === 'trusan') {
            expect(material.color.r).toBeGreaterThan(material.color.g);
            expect(material.color.r).toBeGreaterThan(material.color.b);
          } else {
            expect(material.color.b).toBeGreaterThan(material.color.r);
            expect(material.color.b).toBeGreaterThan(material.color.g);
          }
          pieces++;
        });
        expect(pieces).toBeGreaterThan(0);
      }
    }
  });
});
