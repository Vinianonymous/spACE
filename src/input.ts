import { DEFAULT_MOUSE, MOUSE_STORAGE_KEY, MouseFlight, parseMouseSettings, type MouseSettings } from './mouse-flight';

export class Input {
  keys = new Set<string>();
  mouse = new MouseFlight();
  settings: MouseSettings = { ...DEFAULT_MOUSE };
  private firing = false;
  private wasLocked = false;
  private mouseWarmupUntil = 0;
  onPause = () => {};
  onTarget = () => {};
  onMissile = () => {};
  onHelp = () => {};
  onMouseReleased = () => {};
  onMouseError = () => {};
  onCountermeasures = () => {};
  onFocus = () => {};
  onObjective = () => {};
  active = false;

  constructor(private canvas: HTMLCanvasElement) {
    try { this.settings = parseMouseSettings(localStorage.getItem(MOUSE_STORAGE_KEY)); } catch { /* Storage is optional. */ }
    window.addEventListener('keydown', (event) => {
      const editing = event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLButtonElement;
      if (editing && event.code !== 'Escape') return;
      if ((this.active && event.code === 'Tab') || ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (!event.repeat) {
        if (event.code === 'Escape') this.onPause();
        if (this.active && event.code === 'Tab') this.onTarget();
        if (this.active && event.code === 'KeyM') this.onMissile();
        if (this.active && event.code === 'KeyX') this.onCountermeasures();
        if (this.active && event.code === 'KeyV') this.onFocus();
        if (this.active && event.code === 'KeyG') this.onObjective();
        if (this.active && event.code === 'KeyZ' && this.settings.mode === 'yoke') this.mouse.clear();
        if (event.code === 'KeyH') this.onHelp();
      }
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    document.addEventListener('mousemove', (event) => {
      if (!this.active) return;
      if (this.settings.mode !== 'position') {
        if (document.pointerLockElement !== canvas) return;
        // Browser/OS cursor warps on capture can emit spurious deltas, especially
        // after clicking a pause-menu button. Never interpret those as pilot input.
        if (performance.now() < this.mouseWarmupUntil) return;
        this.mouse.dx += event.movementX;
        this.mouse.dy += event.movementY;
      } else if (event.target === canvas) {
        this.mouse.x = (event.clientX / innerWidth - 0.5) * 2;
        this.mouse.y = (event.clientY / innerHeight - 0.5) * 2;
        this.mouse.steering = true;
      }
    });
    canvas.addEventListener('pointerleave', () => { this.mouse.steering = false; });
    canvas.addEventListener('pointerdown', (event) => {
      if (!this.active) return;
      if (this.settings.mode !== 'position' && document.pointerLockElement !== canvas) { this.captureMouse(); return; }
      if (event.button === 0) this.firing = true;
      if (event.button === 2 && this.active) this.onMissile();
    });
    window.addEventListener('pointerup', () => { this.firing = false; });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      const lost = this.wasLocked && !locked;
      this.wasLocked = locked;
      this.mouse.clear();
      if (locked) this.mouseWarmupUntil = performance.now() + 120;
      if (lost && this.active && this.settings.mode !== 'position') this.onMouseReleased();
    });
    document.addEventListener('pointerlockerror', () => this.onMouseError());
  }

  captureMouse() {
    if (this.settings.mode === 'position' || !this.active || document.pointerLockElement === this.canvas) return;
    try {
      const request = this.canvas.requestPointerLock();
      if (request) request.catch(() => this.onMouseError());
    } catch { this.onMouseError(); }
  }

  releaseMouse() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  configure(settings: MouseSettings) {
    this.settings = parseMouseSettings(JSON.stringify(settings));
    this.clear();
    try { localStorage.setItem(MOUSE_STORAGE_KEY, JSON.stringify(this.settings)); return true; }
    catch { return false; }
  }

  clear() {
    this.keys.clear();
    this.firing = false;
    this.mouse.clear();
  }

  get fire() { return this.keys.has('Space') || this.firing; }
  get padlock() { return this.active && this.keys.has('KeyC'); }

  flight(dt: number) {
    const axis = (positive: string[], negative: string[]) =>
      Number(positive.some((key) => this.keys.has(key))) - Number(negative.some((key) => this.keys.has(key)));
    const mouse = this.mouse.sample(this.settings, dt);
    return {
      pitch: Math.max(-1, Math.min(1, axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']) + mouse.pitch)),
      yaw: Math.max(-1, Math.min(1, axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']) + mouse.yaw)),
      roll: Math.max(-1, Math.min(1, axis(['KeyE'], ['KeyQ']) + mouse.roll)),
      throttle: axis(['KeyR'], ['KeyF']),
      boost: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
    };
  }
}
