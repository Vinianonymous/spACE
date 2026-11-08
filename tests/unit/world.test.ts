import { describe, expect, it } from 'vitest';
import { Box3, Mesh } from 'three';
import { createShip } from '../../src/world';

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
});
