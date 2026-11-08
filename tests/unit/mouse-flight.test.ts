import { describe, expect, it } from 'vitest';
import { DEFAULT_MOUSE, MouseFlight, parseMouseSettings } from '../../src/mouse-flight';

describe('mouse preferences', () => {
  it('defaults to relative flight and rejects corrupt settings', () => {
    expect(parseMouseSettings(null)).toEqual(DEFAULT_MOUSE);
    expect(parseMouseSettings('{broken')).toEqual(DEFAULT_MOUSE);
    expect(parseMouseSettings('null')).toEqual(DEFAULT_MOUSE);
    expect(parseMouseSettings('{"sensitivity":999,"mode":"unknown"}')).toEqual({ ...DEFAULT_MOUSE, sensitivity: 2 });
  });
});

describe('relative mouse flight', () => {
  it('uses motion rather than screen position and stops when movement stops', () => {
    const mouse = new MouseFlight();
    mouse.x = 1;
    mouse.y = 1;
    expect(mouse.sample(DEFAULT_MOUSE, 1 / 60)).toEqual({ yaw: 0, pitch: 0 });
    mouse.dx = 10;
    mouse.dy = -10;
    const motion = mouse.sample(DEFAULT_MOUSE, 1 / 60);
    expect(motion.yaw).toBeGreaterThan(0);
    expect(motion.pitch).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) mouse.sample(DEFAULT_MOUSE, 1 / 60);
    expect(mouse.sample(DEFAULT_MOUSE, 1 / 60).yaw).toBeLessThan(0.00001);
  });

  it('supports sensitivity and pitch inversion without inverting yaw', () => {
    const normal = new MouseFlight(), inverted = new MouseFlight();
    normal.dx = inverted.dx = 1;
    normal.dy = inverted.dy = 1;
    const a = normal.sample(DEFAULT_MOUSE, 1 / 60);
    const b = inverted.sample({ ...DEFAULT_MOUSE, invertPitch: true, sensitivity: 2 }, 1 / 60);
    expect(b.yaw).toBeCloseTo(a.yaw * 2);
    expect(b.pitch).toBeCloseTo(-a.pitch * 2);
  });

  it('keeps position steering available with a center deadzone', () => {
    const mouse = new MouseFlight();
    mouse.steering = true;
    mouse.x = 0.05;
    expect(mouse.sample({ ...DEFAULT_MOUSE, mode: 'position' }, 1 / 60).yaw).toBe(0);
    mouse.x = 1;
    expect(mouse.sample({ ...DEFAULT_MOUSE, mode: 'position' }, 1 / 60).yaw).toBe(1);
  });

  it('clears residual motion on pause or mode changes', () => {
    const mouse = new MouseFlight();
    mouse.dx = 20;
    mouse.sample(DEFAULT_MOUSE, 1 / 60);
    mouse.clear();
    expect(mouse.sample(DEFAULT_MOUSE, 1 / 60)).toEqual({ yaw: 0, pitch: 0 });
  });
});
