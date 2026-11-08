import * as THREE from 'three';
import { Flight, FORWARD, canLock, lockProgress, segmentHitsSphere } from './flight';
import { Input } from './input';
import { Metrics } from './metrics';
import { createShip, createWorld } from './world';
import type { MouseMode } from './mouse-flight';
import { targetGuide } from './target-guide';
import { CameraRig } from './camera-rig';
import { GuideRenderer, guideRotation } from './guide-renderer';
import { Systems } from './systems';
import { ProgressStore } from './progress';
import { LESSONS, Mission, type MissionStage } from './mission';
import { FlightAudio } from './audio';

type State = 'standby' | 'briefing' | 'flying' | 'paused' | 'complete' | 'failed';
type Mode = 'exercise' | 'mission';
type Preset = 'low' | 'medium' | 'high';
interface Drone { mesh: THREE.Group; origin: THREE.Vector3; health: number; phase: number; id: number; hostile: boolean; fireTimer: number; missileTimer: number }
interface Projectile { mesh: THREE.Mesh; velocity: THREE.Vector3; age: number; target?: Drone; damage: number; side: 'player' | 'enemy' | 'ally'; homing?: boolean; practice?: boolean }
interface Particle { mesh: THREE.Mesh; velocity: THREE.Vector3; age: number }

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const clockLabel = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.5, 30000);
  private flight = new Flight();
  private ship = createShip();
  private input: Input;
  private metrics = new Metrics();
  private state: State = 'standby';
  private drones: Drone[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private selected = 0;
  private lock = 0;
  private elapsed = 0;
  private fireCooldown = 0;
  private preset: Preset = 'medium';
  private previousTime = 0;
  private hudElapsed = 0;
  private noticeUntil = 0;
  private gpu = 'unavailable';
  private missileGeometry = new THREE.ConeGeometry(0.7, 4, 5);
  private laserGeometry = new THREE.BoxGeometry(0.45, 0.45, 10);
  private particleGeometry = new THREE.IcosahedronGeometry(1, 0);
  private missileMaterial = new THREE.MeshBasicMaterial({ color: 0xffd58a });
  private laserMaterial = new THREE.MeshBasicMaterial({ color: 0xc6ff9b });
  private particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffad59, transparent: true });
  private markerPosition = new THREE.Vector3();
  private mode: Mode = 'exercise';
  private mission = new Mission();
  private systems = new Systems();
  private progress: ProgressStore;
  private audio = new FlightAudio();
  private runId = '';
  private cameraRig = new CameraRig();
  private guide = new GuideRenderer();
  private dronePool: THREE.Group[] = [];
  private wingmates = [createShip(), createShip(), createShip()];
  private wingFire = 0;
  private pendingStage?: MissionStage;
  private damageUntil = 0;
  private pausedAt = 0;
  private enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff8765 });
  private allyMaterial = new THREE.MeshBasicMaterial({ color: 0x80d9e8 });

  constructor() {
    const canvas = $<HTMLCanvasElement>('viewport');
    if (!canvas.getContext('webgl2')) throw new Error('WebGL 2 context creation failed.');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    const gl = this.renderer.getContext();
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    if (extension) this.gpu = gl.getParameter(extension.UNMASKED_RENDERER_WEBGL);
    createWorld(this.scene);
    this.scene.add(this.ship);
    for (const wingmate of this.wingmates) { wingmate.visible = false; this.scene.add(wingmate); }
    let storage: Storage;
    try { storage = localStorage; }
    catch { storage = { getItem() { throw new Error('Storage unavailable'); }, setItem() { throw new Error('Storage unavailable'); } } as unknown as Storage; }
    this.progress = new ProgressStore(storage);
    this.updateProgress();
    this.resetDrones();
    this.input = new Input(canvas);
    this.input.onPause = () => {
      if ($<HTMLDialogElement>('manual').open) { this.closeManual(); return; }
      if (this.state === 'flying') this.pause('Take a breath, Lion. We’re holding position.');
      else if (this.state === 'paused' && performance.now() - this.pausedAt > 150) this.resume();
    };
    this.input.onTarget = () => this.cycleTarget();
    this.input.onMissile = () => this.fireMissile();
    this.input.onHelp = () => this.openManual();
    this.input.onCountermeasures = () => this.countermeasures();
    this.input.onFocus = () => this.activateFocus();
    this.input.onMouseReleased = () => { if (this.state === 'flying') this.pause('Mouse released. Resume to recapture flight controls.'); };
    this.input.onMouseError = () => this.notice('MOUSE CAPTURE UNAVAILABLE — CLICK THE SCENE TO RETRY, OR CHOOSE SCREEN-POSITION STEERING IN H');
    $<HTMLSelectElement>('mouse-mode').value = this.input.settings.mode;
    $<HTMLInputElement>('mouse-sensitivity').value = String(this.input.settings.sensitivity);
    $<HTMLInputElement>('invert-pitch').checked = this.input.settings.invertPitch;
    const configureMouse = () => {
      const settings = {
        mode: $<HTMLSelectElement>('mouse-mode').value as MouseMode,
        sensitivity: Number($<HTMLInputElement>('mouse-sensitivity').value),
        invertPitch: $<HTMLInputElement>('invert-pitch').checked,
      };
      const saved = this.input.configure(settings);
      $('sensitivity-value').textContent = `${settings.sensitivity.toFixed(2)}×`;
      $('settings-status').textContent = saved ? 'Mouse preferences saved on this browser.' : 'Storage unavailable — preferences apply for this session only.';
    };
    $('sensitivity-value').textContent = `${this.input.settings.sensitivity.toFixed(2)}×`;
    $('mouse-mode').onchange = configureMouse;
    $('mouse-sensitivity').oninput = configureMouse;
    $('invert-pitch').onchange = configureMouse;
    $('launch').onclick = () => { this.state = 'briefing'; $('launch-panel').hidden = true; $('briefing-panel').hidden = false; $('launch-mission').focus(); };
    $('launch-mission').onclick = () => this.start('mission');
    $('exercise').onclick = () => this.start('exercise');
    $('briefing-back').onclick = () => this.returnToTitle();
    $('resume').onclick = () => this.resume();
    $('restart').onclick = () => this.start(this.mode);
    $('fly-again').onclick = () => this.start(this.mode);
    $('retry-mission').onclick = () => this.start(this.mode);
    for (const id of ['return-title', 'debrief-title', 'failure-title-button']) $(id).onclick = () => this.returnToTitle();
    $('view-last').onclick = () => this.viewLastResult();
    $('export-save').onclick = () => this.download(this.progress.export(), 'space-progress.json');
    $('audio-volume').oninput = () => { this.audio.volume = Number($<HTMLInputElement>('audio-volume').value); };
    $('help-button').onclick = () => this.openManual();
    $('close-help').onclick = () => this.closeManual();
    $('export-report').onclick = () => this.exportReport();
    $('complete-report').onclick = () => this.exportReport();
    $('reset-benchmark').onclick = () => { this.metrics.reset(); this.notice('BENCHMARK RESET — sampling resumes in flight'); };
    $<HTMLDialogElement>('manual').addEventListener('cancel', (event) => { event.preventDefault(); this.closeManual(); });
    $<HTMLSelectElement>('quality').onchange = (event) => {
      this.preset = (event.target as HTMLSelectElement).value as Preset;
      this.resize();
      this.metrics.reset();
    };
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('blur', () => { if (this.state === 'flying') this.pause('Browser focus lost. Your flight has been safely paused.'); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'flying') this.pause('Tab hidden. Your flight has been safely paused.'); });
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      if (this.state === 'flying') this.pause('Graphics context lost. Reload the page to restart the prototype.');
      $('fatal').hidden = false;
      $('fatal-message').textContent = 'The graphics device was interrupted. Reload to restore the scene. Previously earned credits remain in local storage; the current sortie must restart.';
    });
    this.resize();
    this.updateShip(0);
    this.camera.position.set(-27, 12, 218);
    this.camera.lookAt(0, 0, 80);
    requestAnimationFrame((time) => this.frame(time));
  }

  private resize() {
    const height = Math.min(innerHeight, { low: 480, medium: 640, high: 900 }[this.preset]);
    this.renderer.setSize(Math.round(height * innerWidth / innerHeight), height, false);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  private resetDrones() {
    this.spawnDrones(8, false);
  }

  private spawnDrones(count: number, hostile: boolean) {
    for (const drone of this.drones) this.scene.remove(drone.mesh);
    this.drones = Array.from({ length: count }, (_, i) => {
      const mesh = this.dronePool[i] ||= createShip(true);
      mesh.scale.setScalar(1.7);
      const origin = this.mode === 'exercise'
        ? new THREE.Vector3(i === 0 ? 0 : Math.sin(i * 2.1) * (240 + i * 85), i === 0 ? 0 : Math.cos(i * 1.7) * 160, -400 - i * 230)
        : new THREE.Vector3(hostile ? Math.sin(i * 2) * 500 : 0, hostile ? Math.cos(i) * 140 : 0, -600 - i * 80).applyQuaternion(this.flight.rotation).add(this.flight.position);
      mesh.position.copy(origin);
      mesh.visible = true;
      this.scene.add(mesh);
      return { mesh, origin, health: 100, phase: i * 1.3, id: this.mode === 'mission' ? this.mission.kills + i + 1 : i + 1, hostile, fireTimer: 8 + i * 1.3, missileTimer: 13 + i * 2.5 };
    });
    this.selected = 0;
    this.lock = 0;
  }

  private start(mode: Mode) {
    this.mode = mode;
    this.mission = new Mission();
    this.systems = new Systems($<HTMLSelectElement>('difficulty').value === 'assist' ? 'assist' : 'standard');
    this.runId = crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    this.pendingStage = undefined;
    this.wingFire = 0;
    this.audio.start();
    this.flight = new Flight();
    this.elapsed = 0;
    this.selected = 0;
    this.lock = 0;
    this.fireCooldown = 0;
    this.metrics.reset();
    for (const projectile of this.projectiles) this.scene.remove(projectile.mesh);
    for (const particle of this.particles) this.scene.remove(particle.mesh);
    this.projectiles = [];
    this.particles = [];
    if (mode === 'exercise') this.resetDrones();
    else this.spawnDrones(0, false);
    this.state = 'flying';
    this.input.clear();
    this.input.active = true;
    for (const id of ['launch-panel', 'briefing-panel', 'pause-panel', 'complete-panel', 'failure-panel']) $(id).hidden = true;
    document.body.classList.add('in-flight');
    this.releaseButtonFocus();
    this.camera.position.set(0, 9, 214);
    this.notice('LION, YOU ARE CLEARED. HOLD SPACE TO FIRE.');
    $('radio').textContent = '“Keep your target inside the reticle. Green brackets mean missile lock.”';
    $('mission-name').textContent = mode === 'mission' ? 'FIRST LIGHT' : 'THE PROVING GROUND';
    $('objective').textContent = 'Eliminate eight Trusan training drones. No incoming fire.';
    $('restart').textContent = 'RESTART SORTIE';
    $('squad-list').hidden = mode !== 'mission';
    $('radar').hidden = false;
    for (const wingmate of this.wingmates) wingmate.visible = mode === 'mission';
    if (mode === 'mission') this.enterStage('flight');
    this.updateWingmates(0);
    this.updateShip(0);
    this.input.captureMouse();
  }

  private returnToTitle() {
    this.state = 'standby';
    this.input.active = false;
    this.input.clear();
    this.input.releaseMouse();
    for (const id of ['briefing-panel', 'pause-panel', 'complete-panel', 'failure-panel', 'target-guide', 'target-marker', 'missile-warning', 'padlock-status', 'radar', 'squad-list']) $(id).hidden = true;
    $('launch-panel').hidden = false;
    document.body.classList.remove('in-flight', 'focus-active', 'padlock-view', 'damage-flash');
    this.flight = new Flight();
    this.mode = 'exercise';
    this.mission = new Mission();
    this.systems = new Systems();
    this.resetDrones();
    this.ship.position.copy(this.flight.position);
    this.ship.quaternion.identity();
    this.camera.up.set(0, 1, 0);
    this.camera.position.set(-27, 12, 218);
    this.camera.lookAt(0, 0, 80);
    this.camera.fov = 65;
    this.camera.updateProjectionMatrix();
    for (const wingmate of this.wingmates) wingmate.visible = false;
    for (const projectile of this.projectiles) this.scene.remove(projectile.mesh);
    this.projectiles = [];
    for (const particle of this.particles) this.scene.remove(particle.mesh);
    this.particles = [];
    $('mission-name').textContent = 'FIRST LIGHT';
    $('objective').textContent = 'A rookie’s first patrol. A nation’s last frontier.';
    this.updateProgress();
    $('launch').focus();
  }

  private updateProgress() {
    $('credits').textContent = `${this.progress.data.credits.toLocaleString()} CR`;
    $('view-last').hidden = !this.progress.data.lastResult;
    $('save-status').hidden = !this.progress.warning;
    $('save-status').textContent = this.progress.warning;
  }

  private viewLastResult() {
    const result = this.progress.data.lastResult;
    if (!result) return;
    this.mode = 'mission';
    this.state = 'complete';
    $('launch-panel').hidden = true;
    this.showDebrief(result.credits, result.seconds, true);
  }

  private showDebrief(reward: number, seconds: number, restored = false) {
    $('complete-panel').hidden = false;
    $('result-time').textContent = clockLabel(seconds);
    $('result-reward').textContent = `${reward.toLocaleString()} CR`;
    $('result-label').textContent = this.mode === 'mission' ? 'FIRST LIGHT / SECTOR SECURE' : 'PROVING GROUND / EXERCISE COMPLETE';
    $('result-story').textContent = this.mode === 'mission' ? `${restored ? 'Previous debrief. Reward already credited. ' : ''}Mars is safe. Tetragon accepts Lion into the squadron. Mission 02 unlocked for a later build; the hangar arrives in phase 3.` : 'All training contacts eliminated. Exercises award no credits.';
    $('fly-again').focus();
  }

  private enterStage(stage: MissionStage) {
    this.mission.stage = stage;
    const lesson = LESSONS[stage];
    $('objective').textContent = lesson.objective;
    this.radio(lesson.speaker, lesson.line);
    if (stage === 'cannon' || stage === 'missile') this.spawnDrones(1, false);
    if (stage === 'defense') { this.spawnDrones(0, false); this.enemyMissile(this.flight.position.clone().add(new THREE.Vector3(0, 0, -550).applyQuaternion(this.flight.rotation)), true); }
    if (stage === 'focus') this.spawnDrones(0, false);
    if (stage === 'raid') this.spawnDrones(6, true);
  }

  private radio(speaker: string, line: string) {
    $('radio-speaker').textContent = speaker;
    $('radio').textContent = `“${line}”`;
    this.notice(line);
  }

  private countermeasures() {
    if (this.state !== 'flying' || !this.systems.countermeasures()) return;
    for (const projectile of this.projectiles) if (projectile.side === 'enemy' && projectile.homing) projectile.age = 100;
    this.explode(this.flight.position, 14);
    this.audio.tone('missile');
    this.notice('COUNTERMEASURES DEPLOYED — MISSILE GUIDANCE BROKEN');
    if (this.mode === 'mission' && this.mission.stage === 'defense') { this.mission.countered = true; this.enterStage('focus'); }
  }

  private activateFocus() {
    if (this.mode === 'mission' && !['focus', 'raid'].includes(this.mission.stage)) { this.notice('IMPLANT CHECK PENDING — COMPLETE THE CURRENT LESSON'); return; }
    if (this.state !== 'flying' || !this.systems.focus()) return;
    this.audio.tone('focus');
    this.notice('VEXTRA FOCUS ACTIVE — TARGETING AUGMENTED');
    if (this.mode === 'mission' && this.mission.stage === 'focus') this.mission.focused = true;
  }

  private finish(success: boolean) {
    if (this.state !== 'flying') return;
    this.state = success ? 'complete' : 'failed';
    this.input.active = false;
    this.input.clear();
    this.input.releaseMouse();
    if (success) {
      let reward = 0;
      if (this.mode === 'mission') {
        this.mission.stage = 'complete';
        reward = 1500 + Math.floor(this.systems.hull * 5);
        this.progress.complete(this.runId, reward, this.elapsed);
        this.updateProgress();
      }
      this.audio.tone('complete');
      this.showDebrief(reward, this.elapsed);
    } else {
      $('failure-panel').hidden = false;
      $('retry-mission').focus();
      this.audio.tone('hit');
    }
  }

  private releaseButtonFocus() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  private pause(reason: string) {
    this.state = 'paused';
    this.pausedAt = performance.now();
    this.input.active = false;
    this.input.clear();
    this.input.releaseMouse();
    $('pause-panel').hidden = false;
    $('pause-reason').textContent = reason;
    $('resume').focus();
  }

  private resume() {
    if (document.hidden || !document.hasFocus()) return;
    this.state = 'flying';
    this.input.clear();
    this.input.active = true;
    $('pause-panel').hidden = true;
    this.previousTime = performance.now();
    this.releaseButtonFocus();
    this.input.captureMouse();
  }

  private openManual() {
    if ($<HTMLDialogElement>('manual').open) { this.closeManual(); return; }
    if (this.state === 'flying') this.pause('Flight manual open. Resume when you’re ready.');
    $<HTMLDialogElement>('manual').showModal();
  }

  private closeManual() {
    $<HTMLDialogElement>('manual').close();
    this.input.clear();
    this.releaseButtonFocus();
  }

  private cycleTarget() {
    const alive = this.drones.filter((drone) => drone.health > 0);
    if (!alive.length) return;
    const current = alive.findIndex((drone) => drone === this.drones[this.selected]);
    this.selected = this.drones.indexOf(alive[(current + 1) % alive.length]);
    this.lock = 0;
  }

  private fireCannon() {
    if (this.fireCooldown > 0 || (this.mode === 'mission' && ['flight', 'missile', 'defense', 'focus'].includes(this.mission.stage))) return;
    if (!this.systems.cannon()) return;
    this.fireCooldown = 0.1;
    this.audio.tone('shot');
    const direction = FORWARD.clone().applyQuaternion(this.flight.rotation);
    const origin = this.flight.position.clone().addScaledVector(direction, 10);
    // Small aim-assist cone keeps the low-resolution arcade prototype approachable.
    const target = this.drones[this.selected];
    if (target?.health > 0) {
      const predicted = target.mesh.position.clone().sub(origin).normalize();
      if (direction.dot(predicted) > Math.cos(THREE.MathUtils.degToRad(this.systems.focusTime > 0 ? 7 : 4))) direction.lerp(predicted, 0.95).normalize();
    }
    const mesh = new THREE.Mesh(this.laserGeometry, this.laserMaterial);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(FORWARD, direction);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, velocity: direction.multiplyScalar(1150 + this.flight.speed), age: 0, damage: 25, side: 'player' });
  }

  private fireMissile() {
    if (this.state !== 'flying') return;
    if (this.mode === 'mission' && ['flight', 'cannon', 'defense', 'focus'].includes(this.mission.stage)) { this.notice('MISSILE RACK SAFE — COMPLETE THE CURRENT SYSTEM CHECK'); return; }
    if (this.systems.missileCooldown > 0) { this.notice('MISSILE RACK RECHARGING'); return; }
    if (this.systems.ammo === 0) { this.notice('MISSILE RACK EMPTY — PULSE CANNON REMAINS AVAILABLE'); return; }
    const target = this.drones[this.selected];
    if (!target || target.health <= 0 || this.lock < 1) { this.notice('NO LOCK — HOLD TARGET IN THE ACQUISITION CONE'); return; }
    if (!this.systems.missile()) return;
    this.audio.tone('missile');
    const mesh = new THREE.Mesh(this.missileGeometry, this.missileMaterial);
    mesh.position.copy(this.flight.position).add(new THREE.Vector3(0, -2, -5).applyQuaternion(this.flight.rotation));
    this.scene.add(mesh);
    this.projectiles.push({ mesh, velocity: FORWARD.clone().applyQuaternion(this.flight.rotation).multiplyScalar(420), age: 0, target, damage: 100, side: 'player' });
    this.notice('FOX TWO — MISSILE AWAY');
  }

  private hit(drone: Drone, damage: number) {
    drone.health = Math.max(0, drone.health - damage);
    this.audio.tone('hit');
    this.explode(drone.mesh.position, drone.health === 0 ? 22 : 4);
    if (drone.health > 0) return;
    drone.mesh.visible = false;
    this.mission.kills++;
    const kills = this.mode === 'mission' ? this.mission.kills : this.drones.filter((item) => item.health === 0).length;
    this.notice(`SPLASH ONE — ${kills} / 8 TARGETS DESTROYED`);
    $('radio').textContent = kills >= 4 ? '“Clean work, Lion. Keep the pressure on.”' : '“Confirmed kill. Find your next target.”';
    if (this.mode === 'exercise' && kills === 8) this.finish(true);
    else if (this.mode === 'mission' && this.mission.stage === 'cannon') this.pendingStage = 'missile';
    else if (this.mode === 'mission' && this.mission.stage === 'missile') this.pendingStage = 'defense';
    else if (this.mode === 'mission' && this.mission.stage === 'raid' && this.drones.every((item) => item.health === 0)) this.finish(true);
    else if (drone === this.drones[this.selected]) this.cycleTarget();
  }

  private enemyMissile(origin: THREE.Vector3, practice = false) {
    const mesh = new THREE.Mesh(this.missileGeometry, this.enemyMaterial);
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, velocity: this.flight.position.clone().sub(origin).normalize().multiplyScalar(practice ? 150 : 230), age: 0, damage: practice ? 30 : 35, side: 'enemy', homing: true, practice });
    this.audio.tone('warning');
  }

  private updateEnemies(dt: number) {
    for (const drone of this.drones) {
      if (drone.health === 0) continue;
      if (!drone.hostile) {
        drone.mesh.position.copy(drone.origin).add(new THREE.Vector3(Math.sin(this.elapsed * 0.3 + drone.phase) * 40, Math.sin(this.elapsed * 0.45 + drone.phase) * 14, Math.sin(this.elapsed * 0.22 + drone.phase) * 40));
        drone.mesh.rotation.set(0, Math.sin(this.elapsed * 0.3 + drone.phase) * 0.3, Math.sin(this.elapsed * 0.5 + drone.phase) * 0.2);
        if (this.mode === 'mission' && drone.mesh.position.distanceTo(this.flight.position) > 1900) {
          drone.origin.copy(new THREE.Vector3(0, 0, -650).applyQuaternion(this.flight.rotation).add(this.flight.position));
          this.notice('TRAINING DRONE RECALLED TO YOUR FORWARD SECTOR');
        }
        continue;
      }
      const orbit = new THREE.Vector3(Math.sin(this.elapsed * 0.12 + drone.phase) * 650, Math.sin(this.elapsed * 0.2 + drone.phase) * 160, Math.cos(this.elapsed * 0.12 + drone.phase) * 650).add(this.flight.position);
      const step = orbit.sub(drone.mesh.position);
      const remaining = step.length();
      drone.mesh.position.addScaledVector(step.normalize(), Math.min(80 * dt, remaining));
      drone.mesh.lookAt(this.flight.position);
      drone.mesh.rotateY(Math.PI); // Ship mesh nose is -Z.
      const distance = drone.mesh.position.distanceTo(this.flight.position);
      drone.fireTimer -= dt;
      drone.missileTimer -= dt;
      if (distance < 1400 && drone.fireTimer <= 0) {
        drone.fireTimer = 4.5 + drone.phase;
        const aim = this.flight.position.clone().addScaledVector(FORWARD.clone().applyQuaternion(this.flight.rotation), this.flight.speed * distance / 520 * 0.65);
        const mesh = new THREE.Mesh(this.laserGeometry, this.enemyMaterial);
        mesh.position.copy(drone.mesh.position);
        const direction = aim.sub(mesh.position).normalize();
        mesh.quaternion.setFromUnitVectors(FORWARD, direction);
        this.scene.add(mesh);
        this.projectiles.push({ mesh, velocity: direction.multiplyScalar(520), age: 0, damage: 12, side: 'enemy' });
      }
      if (distance < 1500 && drone.missileTimer <= 0) {
        drone.missileTimer = 19 + drone.phase * 2;
        this.enemyMissile(drone.mesh.position);
      }
    }
  }

  private updateWingmates(dt: number) {
    if (this.mode !== 'mission') return;
    const offsets = [new THREE.Vector3(-55, 8, -60), new THREE.Vector3(65, -7, -85), new THREE.Vector3(-90, 24, 15)];
    for (let i = 0; i < this.wingmates.length; i++) {
      const mate = this.wingmates[i];
      const desired = offsets[i].applyQuaternion(this.flight.rotation).add(this.flight.position);
      if (!dt) mate.position.copy(desired);
      else mate.position.lerp(desired, 1 - Math.exp(-dt * 2));
      mate.quaternion.slerp(this.flight.rotation, dt ? 1 - Math.exp(-dt * 3) : 1);
    }
    this.wingFire -= dt;
    const target = this.drones.find((drone) => drone.hostile && drone.health > 35);
    if (target && this.wingFire <= 0) {
      this.wingFire = 3.5;
      const mate = this.wingmates[Math.floor(this.elapsed / 3.5) % 3];
      const mesh = new THREE.Mesh(this.laserGeometry, this.allyMaterial);
      mesh.position.copy(mate.position);
      const direction = target.mesh.position.clone().sub(mesh.position).normalize();
      mesh.quaternion.setFromUnitVectors(FORWARD, direction);
      this.scene.add(mesh);
      this.projectiles.push({ mesh, velocity: direction.multiplyScalar(950), age: 0, damage: 7, side: 'ally' });
    }
  }

  private explode(position: THREE.Vector3, count: number) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.particleGeometry, this.particleMaterial);
      mesh.position.copy(position);
      mesh.scale.setScalar(1 + Math.random() * 3);
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(65), age: 0 });
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.age += dt;
      if (projectile.side === 'enemy' && projectile.homing && this.systems.flareTime > 0) projectile.age = 100;
      if (projectile.side === 'enemy' && projectile.homing && projectile.age < 100) {
        const desired = this.flight.position.clone().sub(projectile.mesh.position).normalize().multiplyScalar(projectile.practice ? 180 : 250);
        projectile.velocity.lerp(desired, 1 - Math.exp(-dt * 2.2));
        projectile.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), projectile.velocity.clone().normalize());
      } else if (projectile.target && projectile.target.health > 0) {
        const desired = projectile.target.mesh.position.clone().sub(projectile.mesh.position).normalize().multiplyScalar(550);
        projectile.velocity.lerp(desired, 1 - Math.exp(-dt * 5));
        projectile.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), projectile.velocity.clone().normalize());
      }
      const previous = projectile.mesh.position.clone();
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      let hit = false;
      if (projectile.side === 'enemy' && projectile.age < 100 && segmentHitsSphere(previous, projectile.mesh.position, this.flight.position, 8)) {
        const result = this.systems.damage(projectile.damage);
        this.damageUntil = performance.now() + 250;
        this.audio.tone('hit');
        if (result.shieldBreak) this.notice('SHIELDS DOWN — BREAK CONTACT TO RECHARGE');
        if (result.destroyed) this.finish(false);
        hit = true;
      }
      for (const drone of this.drones) {
        if (projectile.side === 'enemy') break;
        if (drone.health > 0 && segmentHitsSphere(previous, projectile.mesh.position, drone.mesh.position, 15)) {
          if (projectile.side === 'ally') drone.health = Math.max(35, drone.health - projectile.damage);
          else this.hit(drone, projectile.damage);
          hit = true;
          break;
        }
      }
      if (hit || projectile.age > (projectile.target || projectile.homing ? 12 : 3)) {
        this.scene.remove(projectile.mesh);
        this.projectiles.splice(i, 1);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.age += dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.scale.multiplyScalar(Math.exp(-dt * 1.4));
      if (particle.age > 1.2) { this.scene.remove(particle.mesh); this.particles.splice(i, 1); }
    }
  }

  private updateShip(dt: number) {
    this.ship.position.copy(this.flight.position);
    this.ship.quaternion.copy(this.flight.rotation);
    this.ship.traverse((object) => {
      if (object.name === 'flame') object.scale.y = (this.flight.boosting ? 2.4 : 1) * (0.85 + Math.sin(this.elapsed * 40) * 0.15);
    });
    if (this.state !== 'standby' && this.state !== 'briefing') {
      const target = this.drones[this.selected];
      const padlock = this.input.padlock && target?.health > 0;
      this.cameraRig.update(this.camera, this.flight.position, this.flight.rotation, padlock ? target.mesh.position : undefined, dt);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, this.flight.boosting ? 78 : 65, 4, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private updateHud() {
    const drone = this.drones[this.selected];
    const active = this.state === 'flying';
    $('flight-status').textContent = active ? 'LIVE FLIGHT' : this.state.toUpperCase();
    document.body.dataset.missionStage = this.mode === 'mission' ? this.mission.stage : 'exercise';
    $('hull').textContent = `${Math.ceil(this.systems.hull)}%`;
    $('shields').textContent = `${Math.ceil(this.systems.shields)}%`;
    $('hull-bar').style.width = `${this.systems.hull}%`;
    $('shield-bar').style.width = `${this.systems.shields}%`;
    $('ammo').textContent = String(this.systems.ammo);
    $('cannon-state').textContent = this.systems.overheated ? 'OVERHEATED — COOLING' : `HEAT ${Math.round(this.systems.heat)}% [SPACE]`;
    $('heat-bar').style.width = `${this.systems.heat}%`;
    $('flare-state').textContent = this.systems.countermeasureCooldown > 0 ? `${this.systems.countermeasureCooldown.toFixed(1)}s` : 'READY';
    $('focus-state').textContent = this.systems.focusTime > 0 ? `ACTIVE ${this.systems.focusTime.toFixed(1)}s` : this.systems.focusCooldown > 0 ? `${this.systems.focusCooldown.toFixed(1)}s` : 'READY';
    $('focus-bar').style.width = `${this.systems.focusTime > 0 ? this.systems.focusTime / 5 * 100 : (1 - this.systems.focusCooldown / 30) * 100}%`;
    document.body.classList.toggle('focus-active', active && this.systems.focusTime > 0);
    document.body.classList.toggle('damage-flash', active && performance.now() < this.damageUntil);
    $('missile-warning').hidden = !active || !this.projectiles.some((shot) => shot.side === 'enemy' && shot.homing && shot.age < 12);
    $('system-state').textContent = active ? `SORTIE ${clockLabel(this.elapsed)}` : 'SYSTEMS ONLINE';
    $('speed').textContent = String(Math.round(this.flight.speed)).padStart(3, '0');
    $('throttle').textContent = `${Math.round(this.flight.throttle * 100)}%`;
    $('boost').textContent = `${Math.round(this.flight.boost)}%`;
    $('boost-bar').style.width = `${this.flight.boost}%`;
    $('drive-state').textContent = this.flight.boosting ? '/ BOOST' : '/ CRUISE';
    $('kills').textContent = String(this.mode === 'mission' ? this.mission.kills : this.drones.filter((item) => item.health === 0).length).padStart(2, '0');
    $('lock-bar').style.width = `${this.lock * 100}%`;
    $('lock-status').textContent = this.systems.ammo === 0 ? 'RACK EMPTY' : this.systems.missileCooldown > 0 ? `RECHARGING ${this.systems.missileCooldown.toFixed(1)}s` : this.lock === 1 ? 'LOCK CONFIRMED [M]' : this.lock > 0 ? `ACQUIRING ${Math.floor(this.lock * 100)}%` : 'SEEKING TARGET';
    $('lock-status').classList.toggle('locked', this.lock === 1);
    const forward = FORWARD.clone().applyQuaternion(this.flight.rotation);
    $('heading').textContent = String(Math.round((THREE.MathUtils.radToDeg(Math.atan2(forward.x, -forward.z)) + 360) % 360)).padStart(3, '0');
    const size = this.renderer.getSize(new THREE.Vector2());
    $('performance').textContent = `${Math.round(this.metrics.fps) || '—'} FPS / ${size.x} × ${size.y} / ${this.preset.toUpperCase()}`;
    const marker = $('target-marker');
    marker.hidden = !active || !drone || drone.health <= 0;
    const hasTarget = active && !!drone && drone.health > 0;
    const padlock = hasTarget && this.input.padlock;
    $('target-guide').hidden = !hasTarget;
    $('padlock-status').hidden = !padlock;
    document.body.classList.toggle('padlock-view', padlock);
    if (hasTarget) {
      const guide = targetGuide(this.flight.position, padlock ? this.flight.rotation : this.camera.quaternion, drone.mesh.position);
      $('target-guide').style.color = guide.color;
      const orientation = guideRotation(this.flight.position, drone.mesh.position, this.camera.quaternion, this.flight.rotation, padlock);
      const attitude = new THREE.Euler().setFromQuaternion(orientation, 'YXZ');
      const degrees = (value: number) => `${Math.round(THREE.MathUtils.radToDeg(value))}°`;
      $('guide-arrow').dataset.orientation = orientation.toArray().join(',');
      $('guide-arrow').setAttribute('aria-label', padlock ? `Ship attitude: pitch ${degrees(attitude.x)}, yaw ${degrees(attitude.y)}, bank ${degrees(attitude.z)}` : guide.behind ? '3D target direction: behind camera' : '3D target direction in camera coordinates');
      $('guide-caption').textContent = padlock ? 'SHIP ATTITUDE / TARGET' : `${drone.hostile ? 'RAIDER' : 'DRONE'} ${String(drone.id).padStart(2, '0')}`;
      $('guide-distance').textContent = `${Math.round(guide.distance).toLocaleString()} M`;
      $('guide-bearing').textContent = padlock ? `P ${degrees(attitude.x)} · Y ${degrees(attitude.y)} · B ${degrees(attitude.z)}` : guide.behind ? 'REAR · TURN AROUND' : guide.aligned ? 'AHEAD' : 'TURN TO TARGET';
    }
    if (!marker.hidden) {
      const distance = this.flight.position.distanceTo(drone.mesh.position);
      this.markerPosition.copy(drone.mesh.position).project(this.camera);
      const visible = this.markerPosition.z < 1 && Math.abs(this.markerPosition.x) < 0.91 && Math.abs(this.markerPosition.y) < 0.74;
      marker.hidden = !visible;
      marker.style.left = `${(this.markerPosition.x * 0.5 + 0.5) * 100}%`;
      marker.style.top = `${(-this.markerPosition.y * 0.5 + 0.5) * 100}%`;
      marker.classList.toggle('locked', this.lock === 1);
      $('target-label').textContent = `TRUSAN / ${drone.hostile ? 'RAIDER' : 'DRONE'} ${String(drone.id).padStart(2, '0')}`;
      $('target-range').textContent = `${Math.round(distance)} M · HULL ${drone.health}%`;
    }
    if (this.flight.position.length() > 5500 && active) this.notice('SECTOR LIMIT — AUTOPILOT CORRECTING COURSE');
    if (this.mode === 'mission' && active && this.mission.stage === 'flight') {
      $('objective').textContent = `Flight check: ${this.mission.pitch ? '✓' : '□'} pitch · ${this.mission.yaw ? '✓' : '□'} yaw · ${this.mission.roll ? '✓' : '□'} roll (Q/E) · ${this.mission.boost ? '✓' : '□'} boost (Shift)`;
    }
    this.drawRadar();
    if (performance.now() > this.noticeUntil) $('notice').classList.remove('visible');
  }

  private notice(message: string) {
    $('notice').textContent = message;
    $('notice').classList.add('visible');
    this.noticeUntil = performance.now() + 2800;
  }

  private exportReport() {
    const size = this.renderer.getSize(new THREE.Vector2());
    const report = this.metrics.report({ gpu: this.gpu, display: `${innerWidth}x${innerHeight} @ DPR ${devicePixelRatio}`, internalResolution: `${size.x}x${size.y}`, preset: this.preset });
    this.download(JSON.stringify({ ...report, mode: this.mode, missionStage: this.mission.stage, aliveTargets: this.drones.filter((item) => item.health > 0).length }, null, 2), `space-benchmark-${Date.now()}.json`);
  }

  private download(contents: string, name: string) {
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private drawRadar() {
    const canvas = $<HTMLCanvasElement>('radar');
    const context = canvas.getContext('2d');
    if (!context || canvas.hidden) return;
    context.clearRect(0, 0, 130, 90);
    context.strokeStyle = '#75a49744';
    context.beginPath(); context.ellipse(65, 45, 57, 37, 0, 0, Math.PI * 2); context.moveTo(65, 5); context.lineTo(65, 85); context.moveTo(5, 45); context.lineTo(125, 45); context.stroke();
    const inverse = this.flight.rotation.clone().invert();
    const contact = (point: THREE.Vector3, color: string, selected = false) => {
      const local = point.clone().sub(this.flight.position).applyQuaternion(inverse);
      const x = THREE.MathUtils.clamp(65 + local.x / 22, 8, 122), y = THREE.MathUtils.clamp(45 + local.z / 32, 8, 82);
      context.fillStyle = color; context.fillRect(x - 2, y - 2, 4, 4);
      if (selected) { context.strokeStyle = '#e7f3dc'; context.strokeRect(x - 4, y - 4, 8, 8); }
    };
    if (this.mode === 'mission') for (const wingmate of this.wingmates) contact(wingmate.position, '#baff80');
    for (const drone of this.drones) if (drone.health > 0) contact(drone.mesh.position, '#fa9b75', drone === this.drones[this.selected]);
    context.fillStyle = '#e2f3e7'; context.beginPath(); context.moveTo(65, 40); context.lineTo(61, 48); context.lineTo(69, 48); context.fill();
  }

  private frame(time: number) {
    const rawDt = this.previousTime ? (time - this.previousTime) / 1000 : 0;
    this.previousTime = time;
    if (this.state === 'flying') {
      if (rawDt > 0) this.metrics.record(rawDt * 1000);
      // Fixed-size substeps preserve collision and handling during occasional slow frames.
      let remaining = Math.min(rawDt, 0.25);
      // Consume mouse deltas once per displayed frame, not once per simulation substep.
      const controls = this.input.flight(remaining);
      while (remaining > 0 && this.state === 'flying') {
        const dt = Math.min(remaining, 1 / 120);
        remaining -= dt;
        this.elapsed += dt;
        this.flight.update(controls, dt);
        this.systems.update(dt);
        if (this.mode === 'mission') {
          if (this.mission.flightCheck(controls)) this.enterStage('cannon');
          if (this.mission.stage === 'focus' && this.mission.focused && this.systems.focusTime === 0) this.enterStage('raid');
          if (this.mission.stage === 'raid') this.mission.raidTime += dt;
        }
        this.updateEnemies(dt);
        this.updateWingmates(dt);
        const target = this.drones[this.selected];
        const acquisition = (this.systems.focusTime > 0 ? 2.5 : 1) * (this.systems.difficulty === 'assist' ? 1.5 : 1);
        this.lock = lockProgress(this.lock, !!target && target.health > 0 && canLock(this.flight.position, this.flight.rotation, target.mesh.position), dt * acquisition);
        this.fireCooldown = Math.max(0, this.fireCooldown - dt);
        if (this.input.fire) this.fireCannon();
        this.updateProjectiles(dt);
        if (this.pendingStage && this.state === 'flying') { const next = this.pendingStage; this.pendingStage = undefined; this.enterStage(next); }
      }
      this.updateShip(Math.min(rawDt, 0.1));
    } else if (this.state === 'standby' || this.state === 'briefing') {
      this.ship.rotation.z = Math.sin(time * 0.0003) * 0.08;
      this.ship.position.y = Math.sin(time * 0.0005) * 0.5;
    }
    this.renderer.render(this.scene, this.camera);
    this.hudElapsed += rawDt;
    if (this.hudElapsed > 1 / 30) { this.updateHud(); this.hudElapsed = 0; }
    const target = this.drones[this.selected];
    if (this.state === 'flying' && target?.health > 0 && !$('target-guide').hidden) {
      const padlock = this.input.padlock;
      const color = targetGuide(this.flight.position, this.camera.quaternion, target.mesh.position).color;
      this.guide.render(this.renderer, $('guide-arrow').getBoundingClientRect(), guideRotation(this.flight.position, target.mesh.position, this.camera.quaternion, this.flight.rotation, padlock), color);
    }
    requestAnimationFrame((next) => this.frame(next));
  }
}
