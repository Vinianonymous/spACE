import { describe, expect, it } from 'vitest';
import { LESSONS, Mission } from '../../src/mission';

describe('First Light tutorial', () => {
  it('requires pitch, yaw, roll, and boost before weapons training', () => {
    const mission = new Mission();
    expect(mission.flightCheck({ pitch: 1, yaw: 1, roll: 0, boost: true })).toBe(false);
    expect(mission.stage).toBe('flight');
    expect(mission.flightCheck({ pitch: 0, yaw: 0, roll: 1, boost: false })).toBe(true);
    expect(mission.stage).toBe('cannon');
    expect(mission.flightCheck({ pitch: 1, yaw: 1, roll: 1, boost: true })).toBe(false);
  });
  it('provides text instructions and a speaker for every stage', () => {
    for (const lesson of Object.values(LESSONS)) {
      expect(lesson.objective.length).toBeGreaterThan(10);
      expect(lesson.speaker).toContain('TETRAGON');
      expect(lesson.line.length).toBeGreaterThan(10);
    }
  });
});
