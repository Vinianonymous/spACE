export type MouseMode = 'relative' | 'position' | 'yoke';
export interface MouseSettings { mode: MouseMode; sensitivity: number; invertPitch: boolean }
export const DEFAULT_MOUSE: MouseSettings = { mode: 'relative', sensitivity: 1, invertPitch: false };
export const MOUSE_STORAGE_KEY = 'space.mouse.v1';
const clamp = (value: number, min = -1, max = 1) => Math.min(max, Math.max(min, value));

export function parseMouseSettings(value: string | null): MouseSettings {
  try {
    const data = JSON.parse(value || '{}');
    return {
      mode: data?.mode === 'position' || data?.mode === 'yoke' ? data.mode : 'relative',
      sensitivity: typeof data?.sensitivity === 'number' && Number.isFinite(data.sensitivity) ? clamp(data.sensitivity, 0.25, 2) : 1,
      invertPitch: data?.invertPitch === true,
    };
  } catch { return { ...DEFAULT_MOUSE }; }
}

/** Relative flight uses motion rates; mouse yoke accumulates a persistent deflection. */
export class MouseFlight {
  dx = 0;
  dy = 0;
  x = 0;
  y = 0;
  steering = false;
  yokeX = 0;
  yokeY = 0;
  private yaw = 0;
  private pitch = 0;

  clear() {
    this.dx = this.dy = this.x = this.y = this.yaw = this.pitch = 0;
    this.yokeX = this.yokeY = 0;
    this.steering = false;
  }

  sample(settings: MouseSettings, dt: number) {
    let yaw = 0, pitch = 0, roll = 0;
    if (settings.mode === 'yoke') {
      // Relative pixel displacement moves a bounded virtual stick. No auto-centering,
      // velocity conversion, or time-based decay: the point stays where you leave it.
      this.yokeX = clamp(this.yokeX + this.dx * 0.004 * settings.sensitivity);
      this.yokeY = clamp(this.yokeY - this.dy * 0.004 * settings.sensitivity);
      roll = this.yokeX;
      pitch = this.yokeY;
    } else if (settings.mode === 'relative') {
      const seconds = Math.max(dt, 1 / 240);
      yaw = clamp(this.dx * 0.003 * settings.sensitivity / seconds);
      pitch = clamp(-this.dy * 0.003 * settings.sensitivity / seconds);
      // Short time-based filtering removes jitter; no motion decays to straight flight.
      const alpha = 1 - Math.exp(-seconds / 0.035);
      this.yaw += (yaw - this.yaw) * alpha;
      this.pitch += (pitch - this.pitch) * alpha;
      yaw = this.yaw;
      pitch = this.pitch;
    } else if (this.steering) {
      const deadzone = (value: number) => Math.abs(value) < 0.12 ? 0 : Math.sign(value) * (Math.abs(value) - 0.12) / 0.88;
      yaw = clamp(deadzone(this.x) * settings.sensitivity);
      pitch = clamp(-deadzone(this.y) * settings.sensitivity);
    }
    this.dx = this.dy = 0;
    return { yaw, roll, pitch: settings.invertPitch ? -pitch : pitch };
  }
}
