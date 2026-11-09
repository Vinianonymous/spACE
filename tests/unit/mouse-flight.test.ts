import { describe, expect, it } from 'vitest';
import { DEFAULT_MOUSE, MouseFlight, parseMouseSettings } from '../../src/mouse-flight';

describe('mouse preferences', () => {
  it('defaults to relative flight and rejects corrupt settings', () => {
    expect(parseMouseSettings(null)).toEqual(DEFAULT_MOUSE);
    expect(parseMouseSettings('{broken')).toEqual(DEFAULT_MOUSE);
    expect(parseMouseSettings('null')).toEqual(DEFAULT_MOUSE);
    expect(parseMouseSettings('{"mode":"yoke"}').mode).toBe('yoke');
    expect(parseMouseSettings('{"sensitivity":999,"mode":"unknown"}')).toEqual({ ...DEFAULT_MOUSE, sensitivity: 2 });
  });
});

describe('relative mouse flight', () => {
  it('uses motion rather than screen position and stops when movement stops', () => {
    const mouse = new MouseFlight();
    mouse.x = 1;
    mouse.y = 1;
    expect(mouse.sample(DEFAULT_MOUSE, 1 / 60)).toEqual({ yaw: 0, roll: 0, pitch: 0 });
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
    expect(mouse.sample(DEFAULT_MOUSE, 1 / 60)).toEqual({ yaw: 0, roll: 0, pitch: 0 });
  });
});

describe('persistent pitch/roll mouse yoke', () => {
  const yoke = { ...DEFAULT_MOUSE, mode: 'yoke' as const };

  it('holds deflection after movement stops, with horizontal motion driving roll, not yaw', () => {
    const mouse = new MouseFlight();
    mouse.dx = 100;
    mouse.dy = -50;
    expect(mouse.sample(yoke, 1 / 60)).toEqual({ yaw: 0, roll: 0.4, pitch: 0.2 });
    for (let i = 0; i < 600; i++) expect(mouse.sample(yoke, 1 / 60)).toEqual({ yaw: 0, roll: 0.4, pitch: 0.2 });
  });

  it('subtracts opposite motion rather than immediately reversing the held input', () => {
    const mouse = new MouseFlight();
    mouse.dx = 100;
    mouse.sample(yoke, 1 / 60);
    mouse.dx = -40;
    expect(mouse.sample(yoke, 1 / 60).roll).toBeCloseTo(0.24);
    mouse.dx = -60;
    expect(mouse.sample(yoke, 1 / 60).roll).toBeCloseTo(0);
    mouse.dx = -50;
    expect(mouse.sample(yoke, 1 / 60).roll).toBeCloseTo(-0.2);
  });

  it('clamps each axis and discards excess travel so reversal responds immediately', () => {
    const mouse = new MouseFlight();
    mouse.dx = 10000;
    mouse.dy = 10000;
    expect(mouse.sample(yoke, 1 / 60)).toEqual({ yaw: 0, roll: 1, pitch: -1 });
    mouse.dx = -25;
    mouse.dy = -25;
    const movedBack = mouse.sample(yoke, 1 / 60);
    expect(movedBack.roll).toBeCloseTo(0.9);
    expect(movedBack.pitch).toBeCloseTo(-0.9);
  });

  it('uses displacement, not frame rate or cursor screen position', () => {
    const one = new MouseFlight(), many = new MouseFlight();
    one.dx = 100;
    one.x = -1;
    one.sample(yoke, 1 / 20);
    for (let i = 0; i < 5; i++) {
      many.dx = 20;
      many.sample(yoke, 1 / 120);
    }
    expect(many.yokeX).toBeCloseTo(one.yokeX);
    expect(one.yokeX).toBe(0.4);
  });

  it('applies sensitivity to movement and inversion only to pitch', () => {
    const mouse = new MouseFlight();
    mouse.dx = 25;
    mouse.dy = -25;
    expect(mouse.sample({ ...yoke, sensitivity: 2, invertPitch: true }, 1 / 60)).toEqual({ yaw: 0, roll: 0.2, pitch: -0.2 });
  });

  it('recenters safely without leaving buffered motion on pause or mode change', () => {
    const mouse = new MouseFlight();
    mouse.dx = 100;
    mouse.dy = 100;
    mouse.sample(yoke, 1 / 60);
    mouse.dx = 50;
    mouse.clear();
    expect(mouse.sample(yoke, 1 / 60)).toEqual({ yaw: 0, roll: 0, pitch: 0 });
    expect(mouse.sample(DEFAULT_MOUSE, 1 / 60)).toEqual({ yaw: 0, roll: 0, pitch: 0 });
  });
});
