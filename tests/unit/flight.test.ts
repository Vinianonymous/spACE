import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { Flight, canLock, lockProgress, segmentHitsSphere } from '../../src/flight';

const neutral = { pitch: 0, yaw: 0, roll: 0, throttle: 0, boost: false };

describe('arcade flight', () => {
  it('flies forward and keeps the throttle bounded', () => {
    const flight = new Flight();
    flight.update({ ...neutral, throttle: 1 }, 10);
    expect(flight.position.z).toBeLessThan(180);
    expect(flight.throttle).toBe(1);
    flight.update({ ...neutral, throttle: -1 }, 10);
    expect(flight.throttle).toBe(0);
  });

  it('rotates around local axes and preserves a normalized quaternion', () => {
    const flight = new Flight();
    for (let i = 0; i < 1000; i++) flight.update({ ...neutral, pitch: 1, yaw: 0.5, roll: -1 }, 1 / 120);
    expect(flight.rotation.length()).toBeCloseTo(1, 8);
    expect(flight.position.toArray().every(Number.isFinite)).toBe(true);
  });

  it('is approximately frame-rate independent', () => {
    const simulate = (hz: number) => {
      const flight = new Flight();
      for (let i = 0; i < hz * 5; i++) flight.update({ ...neutral, yaw: 0.3 }, 1 / hz);
      return flight;
    };
    expect(simulate(60).position.distanceTo(simulate(120).position)).toBeLessThan(2);
  });

  it('consumes boost, then recharges without input', () => {
    const flight = new Flight();
    flight.update({ ...neutral, boost: true }, 1);
    expect(flight.boost).toBe(74);
    expect(flight.speed).toBeGreaterThan(150);
    flight.update(neutral, 1);
    expect(flight.boost).toBe(88);
  });
  it('brakes even while boosting, slows promptly, and turns faster without changing throttle', () => {
    const cruise = new Flight(), brake = new Flight();
    cruise.update({ ...neutral, yaw: 1 }, 0.25);
    brake.update({ ...neutral, yaw: 1, brake: true, boost: true }, 0.25);
    expect(brake.braking).toBe(true);
    expect(brake.boosting).toBe(false);
    expect(brake.speed).toBeLessThan(cruise.speed);
    expect(brake.rotation.angleTo(new Quaternion())).toBeGreaterThan(cruise.rotation.angleTo(new Quaternion()));
    expect(brake.throttle).toBe(cruise.throttle);
    brake.update(neutral, 0.1); expect(brake.braking).toBe(false);
  });

  it('corrects towards the play area beyond the sector boundary', () => {
    const flight = new Flight();
    flight.position.set(0, 0, -6000);
    flight.update(neutral, 1);
    expect(flight.rotation.angleTo(new Quaternion())).toBeGreaterThan(1);
  });
});

describe('target acquisition', () => {
  it('requires the target to be forward and within range', () => {
    expect(canLock(new Vector3(), new Quaternion(), new Vector3(0, 0, -800))).toBe(true);
    expect(canLock(new Vector3(), new Quaternion(), new Vector3(0, 0, 800))).toBe(false);
    expect(canLock(new Vector3(), new Quaternion(), new Vector3(0, 0, -1700))).toBe(false);
    expect(canLock(new Vector3(), new Quaternion(), new Vector3(500, 0, -500))).toBe(false);
    expect(canLock(new Vector3(), new Quaternion(), new Vector3())).toBe(false);
  });

  it('takes 1.2 seconds to lock and loses lock outside the cone', () => {
    expect(lockProgress(0, true, 0.6)).toBeCloseTo(0.5);
    expect(lockProgress(0.5, true, 0.6)).toBe(1);
    expect(lockProgress(1, false, 0.01)).toBe(0);
  });
});

describe('swept projectile collision', () => {
  it('detects crossing a ship between frames', () => {
    expect(segmentHitsSphere(new Vector3(0, 0, 10), new Vector3(0, 0, -100), new Vector3(), 5)).toBe(true);
    expect(segmentHitsSphere(new Vector3(10, 0, 10), new Vector3(10, 0, -100), new Vector3(), 5)).toBe(false);
  });

  it('handles stationary projectiles and endpoint contact', () => {
    expect(segmentHitsSphere(new Vector3(), new Vector3(), new Vector3(), 5)).toBe(true);
    expect(segmentHitsSphere(new Vector3(), new Vector3(0, 0, -10), new Vector3(0, 0, -15), 5)).toBe(true);
  });
});
