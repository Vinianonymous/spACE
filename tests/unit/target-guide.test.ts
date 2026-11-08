import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { targetGuide } from '../../src/target-guide';

const guide = (x: number, y: number, z: number) => targetGuide(new Vector3(), new Quaternion(), new Vector3(x, y, z));
describe('flight-relative target arrow', () => {
  it('points up, right, down, and left toward the selected target', () => {
    expect(guide(0, 10, -100).angle).toBe(0);
    expect(guide(100, 0, -100).angle).toBe(90);
    expect(guide(0, -100, -100).angle).toBe(180);
    expect(guide(-100, 0, -100).angle).toBe(-90);
  });
  it('identifies ahead and behind without a misleading front arrow', () => {
    expect(guide(0, 0, -100).aligned).toBe(true);
    expect(guide(0, 0, 100).behind).toBe(true);
    expect(guide(0, 0, 100).angle).toBe(180);
  });
  it('uses green nearby and red far away with finite ranges', () => {
    expect(guide(0, 0, -350).color).toBe('hsl(100, 85%, 70%)');
    expect(guide(0, 0, -1600).color).toBe('hsl(6, 85%, 70%)');
    expect(guide(0, 0, 0).distance).toBe(0);
  });
  it('follows ship rotation, not camera direction', () => {
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
    expect(targetGuide(new Vector3(), rotation, new Vector3(0, 0, 100)).aligned).toBe(true);
  });
});
