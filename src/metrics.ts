export interface BenchmarkReport {
  startedAt: string;
  capturedAt: string;
  userAgent: string;
  gpu: string;
  display: string;
  internalResolution: string;
  preset: string;
  scene: string;
  sampleCount: number;
  activeSeconds: number;
  medianFps: number;
  p95FrameMs: number;
  note: string;
}

export class Metrics {
  private samples: number[] = [];
  private startedAt = new Date().toISOString();
  elapsed = 0;
  fps = 0;

  reset() {
    this.samples = [];
    this.elapsed = 0;
    this.startedAt = new Date().toISOString();
  }

  record(milliseconds: number) {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) return;
    // Paused and background frames are excluded by the caller, not by dropping slow samples.
    this.samples.push(milliseconds);
    this.elapsed += milliseconds / 1000;
    if (this.samples.length > 36000) this.samples.shift();
    this.fps = 1000 / milliseconds;
  }

  report(details: Pick<BenchmarkReport, 'gpu' | 'display' | 'internalResolution' | 'preset'>): BenchmarkReport {
    const sorted = [...this.samples].sort((a, b) => a - b);
    const percentile = (p: number) => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] || 0;
    return {
      ...details,
      startedAt: this.startedAt,
      capturedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      scene: 'Mars proving ground: up to 8 moving Trusan drones (destroyed targets removed), 160 asteroids, planet, station, cannon/missile effects',
      sampleCount: sorted.length,
      activeSeconds: Number(this.elapsed.toFixed(2)),
      medianFps: sorted.length ? Number((1000 / percentile(0.5)).toFixed(1)) : 0,
      p95FrameMs: Number(percentile(0.95).toFixed(2)),
      note: 'Active gameplay only. Preset changes reset sampling. Verify physical hardware separately; headless/software-rendered results are not release acceptance evidence.',
    };
  }
}
