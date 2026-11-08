import { describe, expect, it } from 'vitest';
import { Metrics } from '../../src/metrics';

const details = { gpu: 'test', display: '1920x1080', internalResolution: '1138x640', preset: 'medium' };

describe('performance reports', () => {
  it('reports median FPS and p95 including slow frames', () => {
    const metrics = new Metrics();
    for (let i = 0; i < 19; i++) metrics.record(10);
    metrics.record(200);
    const report = metrics.report(details);
    expect(report.medianFps).toBe(100);
    expect(report.p95FrameMs).toBe(10);
    expect(report.sampleCount).toBe(20);
    expect(report.activeSeconds).toBe(0.39);
  });

  it('rejects invalid samples and resets between quality presets', () => {
    const metrics = new Metrics();
    metrics.record(NaN);
    metrics.record(0);
    metrics.record(-10);
    metrics.record(Infinity);
    expect(metrics.report(details).sampleCount).toBe(0);
    metrics.record(16);
    metrics.reset();
    expect(metrics.report(details).medianFps).toBe(0);
    expect(metrics.elapsed).toBe(0);
  });
});
