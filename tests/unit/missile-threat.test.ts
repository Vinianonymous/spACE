import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { missileThreat } from '../../src/missile-threat';

describe('incoming missile direction', () => {
  it('points forward, starboard, aft and port relative to the ship', () => {
    const position = new Vector3(), rotation = new Quaternion();
    expect(missileThreat(position, rotation, new Vector3(0, 0, -900)).bearing).toBeCloseTo(0);
    expect(missileThreat(position, rotation, new Vector3(900, 0, 0)).bearing).toBeCloseTo(90);
    expect(Math.abs(missileThreat(position, rotation, new Vector3(0, 0, 900)).bearing)).toBeCloseTo(180);
    expect(missileThreat(position, rotation, new Vector3(-900, 0, 0)).bearing).toBeCloseTo(-90);
  });
  it('turns with the ship and beeps faster when the missile closes', () => {
    const position = new Vector3(10, 0, 0);
    const rotated = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    expect(missileThreat(position, rotated, new Vector3(-890, 0, 0)).bearing).toBeCloseTo(0);
    expect(missileThreat(position, new Quaternion(), new Vector3(10, 0, -90)).beepInterval)
      .toBeLessThan(missileThreat(position, new Quaternion(), new Vector3(10, 0, -900)).beepInterval);
    expect(missileThreat(position, new Quaternion(), new Vector3(10, 0, -1)).beepInterval).toBe(0.15);
  });
});
