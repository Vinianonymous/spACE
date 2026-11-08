export type MouseMode = 'relative' | 'position';
export interface MouseSettings { mode: MouseMode; sensitivity: number; invertPitch: boolean }
export const DEFAULT_MOUSE: MouseSettings = { mode: 'relative', sensitivity: 1, invertPitch: false };
export const MOUSE_STORAGE_KEY = 'space.mouse.v1';
const clamp = (value: number, min = -1, max = 1) => Math.min(max, Math.max(min, value));

export function parseMouseSettings(value: string | null): MouseSettings {
  try {
    const data = JSON.parse(value || '{}');
    return {
      mode: data?.mode === 'position' ? 'position' : 'relative',
      sensitivity: typeof data?.sensitivity === 'number' && Number.isFinite(data.sensitivity) ? clamp(data.sensitivity, 0.25, 2) : 1,
      invertPitch: data?.invertPitch === true,
    };
  } catch { return { ...DEFAULT_MOUSE }; }
}

/** Relative input represents mouse motion, never the cursor's screen destination. */
export class MouseFlight {
  dx = 0;
  dy = 0;
  x = 0;
  y = 0;
  steering = false;
  private yaw = 0;
  private pitch = 0;

  clear() {
    this.dx = this.dy = this.x = this.y = this.yaw = this.pitch = 0;
    this.steering = false;
  }

  sample(settings: MouseSettings, dt: number) {
    let yaw = 0, pitch = 0;
    if (settings.mode === 'relative') {
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
    return { yaw, pitch: settings.invertPitch ? -pitch : pitch };
  }
}
