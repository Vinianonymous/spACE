import * as THREE from 'three';
import { Flight, FORWARD, canLock, lockProgress, segmentHitsSphere } from './flight';
import { Input } from './input';
import { Metrics } from './metrics';
import { createActor, createCommandVessel, createObjective, createShip, createWorld } from './world';
import type { MouseMode } from './mouse-flight';
import { targetGuide } from './target-guide';
import { CameraRig } from './camera-rig';
import { GuideRenderer, guideRotation } from './guide-renderer';
import { Systems } from './systems';
import { ProgressStore } from './progress';
import { LESSONS, Mission, type MissionStage } from './mission';
import { FlightAudio } from './audio';
import { abilityById, contactLayers, phoenixTargets } from './abilities';
import { BINDING_LABELS, DEFAULT_BINDINGS, PREFS_KEY, bindKey, keyLabel, parsePreferences, type Binding, type Preferences } from './preferences';
import { Hangar } from './hangar';
import { DEFAULT_STATS, buildStats, fittingIssues, partById, shipById, type ShipId } from './catalog';
import { CAMPAIGN, Operation, missionById, missionReward, type CampaignId, type Faction, type SpawnSpec, type TargetKind } from './campaign';
import { SKILLS, Survival, survivalStats, type SkillId } from './survival';
import { EMP_RANGE, EMP_SHIELD_DRAIN, EMP_SUPPRESSION_SECONDS, OVERCLOCK_SPEED, TELEPORT_MAX_RANGE, TELEPORT_MIN_RANGE, overclockDamage, tickFaction } from './factions';

type State = 'standby' | 'briefing' | 'hangar' | 'flying' | 'paused' | 'intermission' | 'complete' | 'failed';
type Mode = 'exercise' | 'mission' | 'survival';
type Preset = 'low' | 'medium' | 'high';
interface Drone {
  mesh: THREE.Group; origin: THREE.Vector3; health: number; maxHealth: number; phase: number; id: number; hostile: boolean;
  fireTimer: number; missileTimer: number; faction: Faction; kind: TargetKind; label: string; required: boolean;
  radius: number; attacksObjective: boolean; lastVolley: number;
  empCooldown: number; empCharge: number; teleportCooldown: number; overclock: number; overclockCooldown: number;
}
interface Projectile { mesh: THREE.Mesh; velocity: THREE.Vector3; age: number; target?: Drone; damage: number; side: 'player' | 'enemy' | 'ally'; homing?: boolean; practice?: boolean; speed?: number; turn?: number; victim?: 'player' | 'objective'; weapon?: 'primary' | 'secondary'; poison?: boolean }
interface Guidance { mesh: THREE.Group; health: number; maxHealth: number; id: number; hostile: boolean; faction: Faction | 'exavius'; label: string; kind?: TargetKind | 'objective'; required?: boolean }
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
  private _state: State = 'standby';
  private get state(): State { return this._state; }
  private set state(value: State) {
    this._state = value;
    // Menu panels keep their layout boxes; visibility is owned by this single flight-state class.
    document.body.classList.toggle('hud-visible', value === 'flying');
  }
  private drones: Drone[] = [];
  private projectiles: Projectile[] = [];
  private poisonEffects: { target: Drone; remaining: number; pending: number }[] = [];
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
  private scratchOrbit = new THREE.Vector3();
  private scratchStep = new THREE.Vector3();
  private scratchAim = new THREE.Vector3();
  private guideBounds?: DOMRect;
  private guideColor = '#baff80';
  private guideTick = 0;
  private adaptive = false;
  private adaptiveElapsed = 0;
  private adaptiveLow = 0;
  private mode: Mode = 'exercise';
  private mission = new Mission();
  private systems = new Systems();
  private progress: ProgressStore;
  private audio = new FlightAudio();
  private preferences: Preferences = parsePreferences(null);
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
  private build = DEFAULT_STATS;
  private hangar: Hangar;
  private hangarReturn: State = 'standby';
  private playerModels = new Map<ShipId, THREE.Group>();
  private campaignId: CampaignId = 1;
  private operation?: Operation;
  private survival?: Survival;
  private baseBuild = DEFAULT_STATS;
  private objectiveSelected = false;
  private objectiveMesh?: THREE.Group;
  private commandVessel?: THREE.Group;
  private scenarioCache = new Map<number, THREE.Group>();
  private actorModels = new Map<string, THREE.Group[]>();
  private actorSerial = 0;
  private pendingVictory = false;
  private commandFire = 0;
  private ionTimer = 0;
  private empSuppressedUntil = 0;
  private radioHoldUntil = 0;
  private aiMaterial = new THREE.MeshBasicMaterial({ color: 0x8dcfff });

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
    this.playerModels.set('kestrel', this.ship);
    for (const wingmate of this.wingmates) { wingmate.visible = false; this.scene.add(wingmate); }
    let storage: Storage;
    try { storage = localStorage; }
    catch { storage = { getItem() { throw new Error('Storage unavailable'); }, setItem() { throw new Error('Storage unavailable'); } } as unknown as Storage; }
    this.progress = new ProgressStore(storage);
    this.updateProgress();
    this.setPlayerShip(this.progress.data.selectedShip);
    this.hangar = new Hangar($<HTMLDialogElement>('hangar'), this.progress, () => this.updateProgress(), () => {
      this.state = this.hangarReturn;
      this.setPlayerShip(this.progress.data.selectedShip);
      this.previousTime = performance.now();
      this.updateProgress();
    });
    for (const id of ['open-hangar', 'briefing-hangar', 'debrief-hangar']) $(id).onclick = () => {
      this.hangarReturn = this.state;
      this.state = 'hangar';
      this.hangar.open();
    };
    this.resetDrones();
    this.input = new Input(canvas);
    try { this.preferences = parsePreferences(localStorage.getItem(PREFS_KEY)); } catch { /* Preferences are session-only. */ }
    this.input.bindings = { ...this.preferences.bindings };
    const savePreferences = () => {
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.preferences)); $('settings-status').textContent = 'Pilot preferences saved in this browser.'; }
      catch { $('settings-status').textContent = 'Storage unavailable — pilot preferences apply for this session only.'; }
    };
    const applyPreferences = () => {
      this.input.bindings = { ...this.preferences.bindings };
      this.input.clear(); // A held old binding must not survive a remap.
      this.audio.volume = this.preferences.volume;
      document.body.classList.toggle('radio-subtitles-off', !this.preferences.subtitles);
      document.body.classList.toggle('reduced-effects', this.preferences.reducedEffects);
      document.documentElement.style.setProperty('--hud-scale', String(this.preferences.hudScale));
      $<HTMLInputElement>('audio-volume').value = String(this.preferences.volume);
      $<HTMLInputElement>('subtitles').checked = this.preferences.subtitles;
      $<HTMLSelectElement>('hud-scale').value = String(this.preferences.hudScale);
      $<HTMLInputElement>('reduced-effects').checked = this.preferences.reducedEffects;
      const keys = this.preferences.bindings;
      document.querySelectorAll('.system-row kbd').forEach((node, index) => { node.textContent = keyLabel(index === 0 ? keys.focus : keys.countermeasures); });
      $('padlock-status').querySelector('kbd')!.textContent = keyLabel(keys.padlock);
      $('missile-warning').querySelector('kbd')!.textContent = keyLabel(keys.countermeasures);
      $('mouse-yoke').querySelector('kbd')!.textContent = keyLabel(keys.recenter);
      $('cannon-state').textContent = `READY [${keyLabel(keys.fire)}]`;
      $('operation-panel').querySelector('small')!.textContent = `${keyLabel(keys.objective)} TRACKS OBJECTIVE · ${keyLabel(keys.target)} SELECTS CONTACT`;
      const bar = document.querySelector('.statusbar > span:last-child')!;
      bar.replaceChildren();
      const targetHint = document.createElement('kbd'); targetHint.textContent = keyLabel(keys.target);
      const helpHint = document.createElement('kbd'); helpHint.textContent = 'H';
      const pauseHint = document.createElement('kbd'); pauseHint.textContent = 'ESC';
      bar.append(targetHint, ' TARGET / ', helpHint, ' CONTROLS / ', pauseHint, ' PAUSE');
    };
    const renderBindings = () => {
      const list = $('binding-list');
      list.replaceChildren();
      for (const action of Object.keys(DEFAULT_BINDINGS) as Binding[]) {
        const row = document.createElement('div');
        row.className = 'settings-row';
        const label = document.createElement('span');
        label.textContent = BINDING_LABELS[action];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'secondary-button';
        button.textContent = keyLabel(this.preferences.bindings[action]);
        button.setAttribute('aria-label', `Remap ${BINDING_LABELS[action]} (currently ${button.textContent})`);
        button.onclick = () => { pendingBinding = action; button.textContent = 'PRESS KEY…'; button.focus(); };
        row.append(label, button);
        list.append(row);
      }
    };
    let pendingBinding: Binding | null = null;
    window.addEventListener('keydown', (event) => {
      if (!pendingBinding) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === 'Escape') { pendingBinding = null; renderBindings(); return; }
      const updated = bindKey(this.preferences.bindings, pendingBinding, event.code);
      if (!updated) { $('settings-status').textContent = 'Key unavailable or already assigned. Choose a different key, or press Escape to cancel.'; return; }
      this.preferences.bindings = updated;
      pendingBinding = null;
      applyPreferences(); renderBindings(); savePreferences();
    }, true);
    $('reset-bindings').onclick = () => { pendingBinding = null; this.preferences.bindings = { ...DEFAULT_BINDINGS }; applyPreferences(); renderBindings(); savePreferences(); };
    $<HTMLDialogElement>('manual').addEventListener('close', () => { pendingBinding = null; renderBindings(); });
    $<HTMLInputElement>('audio-volume').oninput = () => { this.preferences.volume = Number($<HTMLInputElement>('audio-volume').value); applyPreferences(); savePreferences(); };
    $<HTMLInputElement>('subtitles').onchange = () => { this.preferences.subtitles = $<HTMLInputElement>('subtitles').checked; applyPreferences(); savePreferences(); };
    $<HTMLSelectElement>('hud-scale').onchange = () => { this.preferences.hudScale = Number($<HTMLSelectElement>('hud-scale').value); applyPreferences(); savePreferences(); };
    $<HTMLInputElement>('reduced-effects').onchange = () => { this.preferences.reducedEffects = $<HTMLInputElement>('reduced-effects').checked; applyPreferences(); savePreferences(); };
    applyPreferences(); renderBindings();
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
    this.input.onObjective = () => {
      if (!this.operation || !this.objectiveMesh) { this.notice('NO NAVIGATION OBJECTIVE IN THIS MODE'); return; }
      this.objectiveSelected = !this.objectiveSelected;
      this.lock = 0;
      this.notice(this.objectiveSelected ? `TRACKING MISSION OBJECTIVE — ${keyLabel(this.input.bindings.target)} SELECTS HOSTILES` : 'HOSTILE TARGETING RESTORED');
    };
    this.input.onMouseReleased = () => { if (this.state === 'flying') this.pause('Mouse released. Resume to recapture flight controls.'); };
    this.input.onMouseError = () => this.notice('MOUSE CAPTURE UNAVAILABLE — CLICK THE SCENE TO RETRY, OR CHOOSE SCREEN-POSITION STEERING IN H');
    $<HTMLSelectElement>('mouse-mode').value = this.input.settings.mode;
    $<HTMLInputElement>('mouse-sensitivity').value = String(this.input.settings.sensitivity);
    $<HTMLInputElement>('invert-pitch').checked = this.input.settings.invertPitch;
    const describeMouse = () => {
      $('mouse-axis-label').textContent = this.input.settings.mode === 'yoke' ? 'Mouse pitch / roll' : 'Mouse pitch / yaw';
      $('mouse-axis-control').textContent = this.input.settings.mode === 'yoke' ? 'HELD YOKE DEFLECTION' : this.input.settings.mode === 'relative' ? 'MOUSE MOTION' : 'CURSOR POSITION';
      $('mouse-description').textContent = this.input.settings.mode === 'yoke'
        ? 'Mouse yoke captures the cursor. Move right/left to shift and HOLD roll input; move up/down to shift and HOLD pitch input. Stopping the mouse keeps that deflection—move back toward center to stop rotating, or press Z to recenter. The small Cartesian grid shows the current pitch/roll input. A/D still control yaw. Pause, restart, and mouse recapture safely recenter the yoke.'
        : this.input.settings.mode === 'relative'
          ? 'Relative flight captures the cursor: mouse motion controls pitch and yaw; stop moving to fly straight. Escape releases the cursor and pauses. Launch/Resume recaptures. Choose Mouse yoke for persistent pitch/roll deflection instead.'
          : 'Screen-position steering uses the cursor’s distance from the screen center for pitch and yaw. Move the cursor back to center to stop turning. This mode does not capture the cursor. Move off the flight scene for keyboard-only input.';
    };
    describeMouse();
    const configureMouse = () => {
      const settings = {
        mode: $<HTMLSelectElement>('mouse-mode').value as MouseMode,
        sensitivity: Number($<HTMLInputElement>('mouse-sensitivity').value),
        invertPitch: $<HTMLInputElement>('invert-pitch').checked,
      };
      const saved = this.input.configure(settings);
      describeMouse();
      $('sensitivity-value').textContent = `${settings.sensitivity.toFixed(2)}×`;
      $('settings-status').textContent = saved ? 'Mouse preferences saved on this browser.' : 'Storage unavailable — preferences apply for this session only.';
    };
    $('sensitivity-value').textContent = `${this.input.settings.sensitivity.toFixed(2)}×`;
    $('mouse-mode').onchange = configureMouse;
    $('mouse-sensitivity').oninput = configureMouse;
    $('invert-pitch').onchange = configureMouse;
    $('launch').onclick = () => this.progress.data.campaignComplete ? this.openCampaign() : this.openBriefing(this.progress.data.unlockedMission);
    $('campaign-button').onclick = () => this.openCampaign();
    $('campaign-close').onclick = () => $<HTMLDialogElement>('campaign-select').close();
    $('next-mission').onclick = () => this.campaignId < 5 ? this.openBriefing((this.campaignId + 1) as CampaignId) : this.openCampaign();
    $('survival-button').onclick = () => $<HTMLDialogElement>('survival-briefing').showModal();
    $('survival-cancel').onclick = () => $<HTMLDialogElement>('survival-briefing').close();
    $('survival-start').onclick = () => { $<HTMLDialogElement>('survival-briefing').close(); this.start('survival'); };
    $('survival-next').onclick = () => this.nextSurvivalWave();
    $('survival-exit').onclick = () => this.returnToTitle();
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
    $('help-button').onclick = () => this.openManual();
    $('close-help').onclick = () => this.closeManual();
    $('export-report').onclick = () => this.exportReport();
    $('complete-report').onclick = () => this.exportReport();
    $('reset-benchmark').onclick = () => { this.metrics.reset(); this.notice('BENCHMARK RESET — sampling resumes in flight'); };
    $<HTMLDialogElement>('manual').addEventListener('cancel', (event) => { event.preventDefault(); this.closeManual(); });
    $<HTMLSelectElement>('quality').onchange = (event) => {
      const value = (event.target as HTMLSelectElement).value;
      this.adaptive = value === 'auto';
      this.adaptiveElapsed = 0; this.adaptiveLow = 0;
      this.preset = value === 'auto' ? 'medium' : value as Preset;
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
    this.guideBounds = undefined;
  }

  /** Auto quality is opt-in; it only steps down once after sustained sub-52 FPS. */
  private updateAdaptive(rawDt: number) {
    if (!this.adaptive || this.preset === 'low') return;
    this.adaptiveElapsed += rawDt;
    if (this.adaptiveElapsed < 1) return;
    this.adaptiveElapsed = 0;
    if (this.metrics.fps > 0 && this.metrics.fps < 52) this.adaptiveLow++;
    else this.adaptiveLow = 0;
    if (this.adaptiveLow >= 3) {
      this.adaptiveLow = 0;
      this.preset = 'low';
      this.resize();
      this.notice('ADAPTIVE QUALITY — STEPPED DOWN TO 480p TO PROTECT FRAME RATE');
    }
  }

  private resetDrones() {
    this.spawnDrones(8, false);
  }

  private spawnDrones(count: number, hostile: boolean) {
    for (const drone of this.drones) this.scene.remove(drone.mesh);
    this.poisonEffects = [];
    this.drones = Array.from({ length: count }, (_, i) => {
      const mesh = this.dronePool[i] ||= createShip(true);
      mesh.scale.setScalar(1.7);
      const origin = this.mode === 'exercise'
        ? new THREE.Vector3(i === 0 ? 0 : Math.sin(i * 2.1) * (240 + i * 85), i === 0 ? 0 : Math.cos(i * 1.7) * 160, -400 - i * 230)
        : new THREE.Vector3(hostile ? Math.sin(i * 2) * 500 : 0, hostile ? Math.cos(i) * 140 : 0, -600 - i * 80).applyQuaternion(this.flight.rotation).add(this.flight.position);
      mesh.position.copy(origin);
      mesh.visible = true;
      this.scene.add(mesh);
      const id = this.mode === 'mission' ? this.mission.kills + i + 1 : i + 1;
      return { mesh, origin, health: 100, maxHealth: 100, phase: i * 1.3, id, hostile, fireTimer: 8 + i * 1.3, missileTimer: 13 + i * 2.5, faction: 'trusan', kind: 'fighter', label: `${hostile ? 'RAIDER' : 'DRONE'} ${String(id).padStart(2, '0')}`, required: true, radius: 15, attacksObjective: false, lastVolley: -1,
        empCooldown: 0, empCharge: 0, teleportCooldown: 9 + i % 5, overclock: 0, overclockCooldown: 0 };
    });
    this.selected = 0;
    this.lock = 0;
  }

  private openCampaign() {
    const data = this.progress.data;
    $('campaign-status').textContent = data.campaignComplete ? 'LOCAL OPERATION WON. All five missions remain replayable with every owned ship.' : `Mission ${data.unlockedMission} available. Complete missions in order; completed missions remain replayable.`;
    $('campaign-missions').innerHTML = CAMPAIGN.map((mission) => `<button id="mission-${mission.id}" class="campaign-card" data-mission="${mission.id}" ${mission.id > data.unlockedMission ? 'disabled' : ''}><span>0${mission.id} / ${mission.sector.toUpperCase()}</span><b>${mission.title.toUpperCase()}</b><small>${data.completedMissions.includes(mission.id) ? 'COMPLETED / REPLAY' : mission.id <= data.unlockedMission ? 'AVAILABLE' : 'LOCKED'} · ${mission.baseReward.toLocaleString()} CR BASE</small></button>`).join('');
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mission]')) button.onclick = () => { $<HTMLDialogElement>('campaign-select').close(); this.openBriefing(Number(button.dataset.mission) as CampaignId); };
    $<HTMLDialogElement>('campaign-select').showModal();
  }

  private openBriefing(id: CampaignId) {
    if (id > this.progress.data.unlockedMission) { this.notice('MISSION LOCKED — COMPLETE THE PRECEDING SORTIE'); return; }
    this.campaignId = id;
    this.state = 'briefing';
    for (const panel of ['launch-panel', 'complete-panel', 'failure-panel', 'pause-panel']) $(panel).hidden = true;
    $('briefing-panel').hidden = false;
    const mission = missionById(id)!;
    $('briefing-title').textContent = mission.title.toUpperCase();
    $('briefing-sector').textContent = `EXAVIUS / MISSION 0${id} / ${mission.sector.toUpperCase()}`;
    $('briefing-prose').textContent = mission.briefing;
    $('briefing-objectives').replaceChildren(...mission.objectives.map((objective) => { const li = document.createElement('li'); li.textContent = objective; return li; }));
    $('briefing-reward').textContent = `BASE ${mission.baseReward.toLocaleString()} CR / SURVIVAL UP TO ${mission.survivalBonus} CR${mission.optionalBonus ? ` / OPTIONAL ${mission.optionalBonus} CR` : ''}`;
    this.updateProgress();
    $('launch-mission').focus();
  }

  private clearScenario() {
    if (this.objectiveMesh) this.scene.remove(this.objectiveMesh);
    this.objectiveMesh = undefined;
    if (this.commandVessel) { this.commandVessel.visible = false; this.scene.remove(this.commandVessel); }
    this.operation = undefined;
    this.survival?.end();
    this.survival = undefined;
    this.objectiveSelected = false;
  }

  private setupOperation(id: Exclude<CampaignId, 1>) {
    this.operation = new Operation(id);
    let objective = this.scenarioCache.get(id);
    if (!objective) { objective = createObjective(id === 2 ? 'convoy' : id === 3 ? 'beacon' : id === 4 ? 'depot' : 'extraction'); this.scenarioCache.set(id, objective); }
    this.objectiveMesh = objective;
    objective.visible = true;
    objective.position.set(...this.operation.objectivePosition);
    this.scene.add(objective);
    if (id === 5) {
      this.commandVessel ||= createCommandVessel();
      this.commandVessel.position.set(0, 150, -2400);
      this.commandVessel.visible = false;
      this.scene.add(this.commandVessel);
    }
    this.mission.stage = 'raid';
    this.processOperationEvents();
  }

  private spawnActors(specs: SpawnSpec[], relative = false, anchor?: THREE.Vector3) {
    for (const actor of this.drones) if (actor.health <= 0) this.scene.remove(actor.mesh);
    this.drones = this.drones.filter((actor) => actor.health > 0);
    const occupied = new Set(this.drones.map((actor) => actor.mesh));
    const start = this.drones.length;
    for (const spec of specs) {
      const key = `${spec.faction}:${spec.kind}`;
      const pool = this.actorModels.get(key) || [];
      let mesh = pool.find((model) => !occupied.has(model));
      if (!mesh) { mesh = createActor(spec.faction, spec.kind); pool.push(mesh); this.actorModels.set(key, pool); }
      occupied.add(mesh);
      mesh.visible = true; mesh.rotation.set(0, 0, 0);
      mesh.scale.setScalar(spec.kind === 'boss' ? 0.45 : spec.kind === 'fighter' ? 1.7 : spec.kind === 'heavy' ? 2.2 : 1);
      const origin = new THREE.Vector3(...spec.position);
      if (relative) origin.applyQuaternion(this.flight.rotation).add(this.flight.position);
      else if (anchor) origin.add(anchor);
      mesh.position.copy(origin); this.scene.add(mesh);
      const id = ++this.actorSerial;
      this.drones.push({ mesh, origin, health: spec.health, maxHealth: spec.health, phase: id * 1.3, id,
        hostile: ['fighter', 'heavy', 'turret', 'boss'].includes(spec.kind), fireTimer: spec.faction === 'naurae' ? 6 : 6 + id % 4,
        missileTimer: 12 + id % 6, faction: spec.faction, kind: spec.kind, label: spec.label, required: spec.required,
        radius: spec.kind === 'boss' ? 75 : spec.kind === 'core' ? 38 : ['fighter', 'heavy'].includes(spec.kind) ? spec.kind === 'heavy' ? 22 : 15 : 25,
        attacksObjective: !!spec.attacksObjective, lastVolley: Math.floor(this.elapsed / 7),
        empCooldown: spec.faction === 'naurae' ? 5 + id % 4 : 0, empCharge: 0,
        teleportCooldown: spec.faction === 'naurae' ? 8 + id % 6 : 0, overclock: 0, overclockCooldown: 0,
      });
    }
    this.selected = specs.findIndex((spec) => spec.required) + start;
    if (this.selected < start) this.selected = start;
    this.objectiveSelected = false;
    this.lock = 0;
  }

  private processOperationEvents() {
    if (!this.operation) return;
    for (const event of this.operation.drain()) {
      if (event.type === 'spawn') this.spawnActors(event.actors);
      else if (event.type === 'radio') this.radio(event.speaker, event.line);
      else if (event.type === 'phase') {
        $('objective').textContent = event.objective;
        this.notice(event.objective);
        if (this.operation.id === 5 && event.phase === 'relays') {
          if (this.commandVessel) this.commandVessel.visible = true;
          if (this.objectiveMesh) this.objectiveMesh.visible = false;
          for (const shot of this.projectiles) if (shot.side === 'enemy') { shot.age = 100; }
          this.commandFire = 6;
        }
      } else if (event.type === 'failed') this.finish(false, event.reason);
      else if (event.type === 'complete') {
        if (this.commandVessel && this.operation.id === 5) { this.explode(this.commandVessel.position, 55); this.commandVessel.visible = false; }
        this.finish(true);
      }
    }
  }

  private navigationMesh() { return this.operation?.id === 5 && this.operation.phase !== 'extraction' ? this.commandVessel : this.objectiveMesh; }

  private guidanceTarget(): Guidance | undefined {
    const selected = this.drones[this.selected];
    if (!this.objectiveSelected && selected?.health > 0) return selected;
    const mesh = this.navigationMesh();
    if (mesh && this.operation) return { mesh, id: 0, health: this.operation.protectedActive ? this.operation.objectiveHealth : 1, maxHealth: this.operation.protectedActive ? this.operation.maxObjectiveHealth : 1, faction: 'exavius', hostile: false, label: this.operation.objectiveLabel, kind: 'objective', required: false };
    return selected?.health > 0 ? selected : undefined;
  }

  private processSurvivalEvents() {
    if (!this.survival) return;
    for (const event of this.survival.drain()) {
      if (event.type === 'spawn') {
        const boss = this.drones.find((actor) => actor.kind === 'boss' && actor.health > 0);
        this.spawnActors(event.actors, !event.summon, event.summon ? boss?.mesh.position.clone() : undefined);
        if (event.summon) { this.audio.tone('warning'); this.notice('SUMMONER DEPLOYING REINFORCEMENTS'); }
      } else if (event.type === 'boss') this.radio('TETRAGON / SURVIVAL CONTROL', `Wave ${this.survival.wave} cleared of regular contacts. Summoner incoming: destroy it to stop its reinforcement ships.`);
      else if (event.type === 'intermission') {
        this.state = 'intermission'; this.input.active = false; this.input.clear(); this.input.releaseMouse();
        $('survival-shop').hidden = false;
        $('survival-shop-summary').textContent = `Wave ${this.survival.cleared} complete. Earned ${event.earned} run tokens. Skills apply to the next wave and expire at the end of this run. Continue without buying to save tokens.`;
        this.renderSurvivalShop(); $('survival-shop').tabIndex = -1; $('survival-shop').focus();
      }
    }
  }

  private renderSurvivalShop() {
    const run = this.survival;
    if (!run) return;
    $('shop-tokens').textContent = String(run.tokens);
    $('survival-skills').innerHTML = SKILLS.map((skill) => `<div class="survival-skill"><h3>${skill.name} <span>${run.skills[skill.id]} / 3</span></h3><p>${skill.description}</p><button id="skill-${skill.id}" class="secondary-button" ${run.skills[skill.id] >= 3 || run.tokens < run.price(skill.id) ? 'disabled' : ''}>${run.skills[skill.id] >= 3 ? 'MAX RANK' : `BUY RANK ${run.skills[skill.id] + 1} / ${run.price(skill.id)} TOKENS`}</button></div>`).join('');
    for (const skill of SKILLS) $(`skill-${skill.id}`).onclick = () => {
      try { run.buy(skill.id as SkillId); this.renderSurvivalShop(); $('survival-shop-message').textContent = `${skill.name} rank ${run.skills[skill.id]} purchased for this run only.`; }
      catch (error) { $('survival-shop-message').textContent = error instanceof Error ? error.message : 'Could not purchase skill.'; }
    };
    $('survival-next').textContent = `CONTINUE TO WAVE ${run.wave + 1} ↗`;
  }

  private nextSurvivalWave() {
    if (!this.survival || this.state !== 'intermission') return;
    const hull = Math.min(1, this.systems.hull / this.build.hull + 0.25);
    this.survival.next();
    this.build = survivalStats(this.baseBuild, this.survival);
    this.systems = new Systems(this.systems.difficulty, this.build, this.progress.data.selectedAbility);
    this.systems.hull = this.build.hull * hull;
    this.flight.stats = this.build; this.flight.boost = this.build.boostCapacity;
    for (const shot of this.projectiles) this.scene.remove(shot.mesh);
    this.projectiles = []; this.poisonEffects = []; this.fireCooldown = 0; this.ionTimer = 0;
    $('survival-shop').hidden = true;
    this.state = 'flying'; this.input.clear(); this.input.active = true; this.releaseButtonFocus(); this.previousTime = performance.now();
    this.processSurvivalEvents();
    this.notice(`WAVE ${this.survival.wave} — ${this.survival.wave % 10 === 0 ? 'SUMMONER AFTER REGULAR CONTACTS' : 'WEAPONS FREE'}`);
    this.input.captureMouse();
  }

  private start(mode: Mode) {
    const data = this.progress.data;
    if (mode === 'mission' && this.campaignId > data.unlockedMission) { this.notice('MISSION LOCKED — SELECT AN AVAILABLE SORTIE'); return; }
    const loadout = data.loadouts[data.selectedShip]!;
    const issues = fittingIssues(data.selectedShip, loadout, data.parts);
    if (issues.length || !data.ownedShips.includes(data.selectedShip)) { this.notice(`CANNOT LAUNCH: ${issues.join(' ') || 'Hull not owned.'}`); return; }
    this.baseBuild = buildStats(data.selectedShip, loadout, data.parts);
    this.build = { ...this.baseBuild };
    this.clearScenario();
    this.setPlayerShip(data.selectedShip);
    this.mode = mode;
    this.mission = new Mission();
    this.systems = new Systems($<HTMLSelectElement>('difficulty').value === 'assist' ? 'assist' : 'standard', this.build,
      mode === 'mission' && this.campaignId === 1 ? 'focus' : data.selectedAbility);
    this.runId = crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    this.pendingStage = undefined;
    this.pendingVictory = false;
    this.actorSerial = 0;
    this.ionTimer = 0;
    this.empSuppressedUntil = 0;
    this.commandFire = 0;
    $('radio-transcript').replaceChildren();
    this.wingFire = 0;
    this.audio.start();
    this.flight = new Flight(this.build);
    this.elapsed = 0;
    this.selected = 0;
    this.lock = 0;
    this.fireCooldown = 0;
    this.metrics.reset();
    this.guideBounds = undefined;
    this.guideTick = 0;
    for (const projectile of this.projectiles) this.scene.remove(projectile.mesh);
    for (const particle of this.particles) this.scene.remove(particle.mesh);
    this.projectiles = [];
    this.poisonEffects = [];
    this.particles = [];
    if (mode === 'exercise') this.resetDrones();
    else this.spawnDrones(0, false);
    this.state = 'flying';
    this.input.clear();
    this.input.active = true;
    for (const id of ['launch-panel', 'briefing-panel', 'pause-panel', 'complete-panel', 'failure-panel', 'survival-shop']) $(id).hidden = true;
    document.body.classList.add('in-flight');
    this.releaseButtonFocus();
    this.camera.position.set(0, 9, 214);
    this.notice(`LION, YOU ARE CLEARED. HOLD ${keyLabel(this.input.bindings.fire)} TO FIRE.`);
    $('radio').textContent = '“Keep your target inside the reticle. Green brackets mean missile lock.”';
    $('mission-name').textContent = mode === 'mission' ? missionById(this.campaignId)!.title.toUpperCase() : mode === 'survival' ? 'WAVE SURVIVAL' : 'THE PROVING GROUND';
    $('objective').textContent = 'Eliminate eight Trusan training drones. No incoming fire.';
    $('restart').textContent = 'RESTART SORTIE';
    $('squad-list').hidden = mode !== 'mission';
    $('radar').hidden = false;
    for (const wingmate of this.wingmates) wingmate.visible = mode === 'mission';
    if (mode === 'mission' && this.campaignId === 1) this.enterStage('flight');
    else if (mode === 'mission') this.setupOperation(this.campaignId as Exclude<CampaignId, 1>);
    else if (mode === 'survival') {
      this.survival = new Survival();
      $('objective').textContent = 'Clear each wave. Spend run tokens between waves. Every tenth wave ends with a summoning boss.';
      this.processSurvivalEvents();
    }
    $('failure-title').textContent = mode === 'survival' ? 'RUN ENDED' : 'SORTIE FAILED';
    $('retry-mission').textContent = mode === 'survival' ? 'START NEW RUN ↗' : 'RESTART SORTIE ↗';
    this.updateWingmates(0);
    this.updateShip(0);
    this.input.captureMouse();
  }

  private returnToTitle() {
    this.clearScenario();
    this.state = 'standby';
    this.input.active = false;
    this.input.clear();
    this.input.releaseMouse();
    for (const id of ['briefing-panel', 'pause-panel', 'complete-panel', 'failure-panel', 'survival-shop', 'target-guide', 'target-marker', 'objective-marker', 'missile-warning', 'threat-warning', 'padlock-status', 'boss-status', 'operation-panel', 'survival-hud', 'radar', 'squad-list']) $(id).hidden = true;
    $('launch-panel').hidden = false;
    document.body.classList.remove('in-flight', 'focus-active', 'padlock-view', 'damage-flash', 'operation-active', 'boss-active');
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
    this.poisonEffects = [];
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
    const next = missionById(this.progress.data.unlockedMission)!;
    $('launch').innerHTML = this.progress.data.campaignComplete ? 'CAMPAIGN COMPLETE / REPLAY <span>↗</span>' : `MISSION 0${next.id} / ${next.title.toUpperCase()} <span>↗</span>`;
    $<HTMLButtonElement>('launch-mission').disabled = this.campaignId > this.progress.data.unlockedMission;
    const data = this.progress.data, ship = shipById(data.selectedShip)!;
    const loadout = data.loadouts[data.selectedShip]!;
    if (this.state === 'standby' || this.state === 'briefing') {
      this.build = buildStats(data.selectedShip, loadout, data.parts);
      this.flight = new Flight(this.build);
      this.systems = new Systems('standard', this.build, data.selectedAbility);
    }
    $('equipped-ship').textContent = `${ship.code} ${ship.name.toUpperCase()}`;
    $('primary-name').textContent = partById(loadout.primary)!.name.toUpperCase();
    $('secondary-name').textContent = partById(loadout.secondary)!.name.toUpperCase();
    $('briefing-loadout').textContent = `SELECTED: ${ship.code} ${ship.name} / ${partById(loadout.primary)!.name} / ${partById(loadout.secondary)!.name} / ${abilityById(data.selectedAbility)!.name}. Change your saved build in the hangar.`;
  }

  private setPlayerShip(id: ShipId) {
    const position = this.ship.position.clone(), rotation = this.ship.quaternion.clone();
    this.scene.remove(this.ship);
    let model = this.playerModels.get(id);
    if (!model) { model = createShip(false, id); this.playerModels.set(id, model); }
    this.ship = model;
    this.ship.position.copy(position); this.ship.quaternion.copy(rotation);
    this.scene.add(this.ship);
  }

  private viewLastResult() {
    const result = this.progress.data.lastResult;
    if (!result) return;
    this.mode = 'mission';
    this.campaignId = result.missionId || 1;
    this.state = 'complete';
    $('launch-panel').hidden = true;
    this.showDebrief(result.credits, result.seconds, true);
  }

  private showDebrief(reward: number, seconds: number, restored = false) {
    $('complete-panel').hidden = false;
    $('result-time').textContent = clockLabel(seconds);
    $('result-reward').textContent = `${reward.toLocaleString()} CR`;
    const mission = missionById(this.campaignId)!;
    $('result-label').textContent = this.mode === 'mission' ? `${mission.title.toUpperCase()} / SECTOR SECURE` : 'PROVING GROUND / EXERCISE COMPLETE';
    $('complete-title').textContent = this.mode === 'mission' && this.campaignId === 5 ? 'OPERATION SECURED.' : 'NICE FLYING, LION.';
    const optional = restored ? this.progress.data.lastResult?.optionalComplete : this.operation?.optionalComplete;
    $('result-story').textContent = this.mode === 'mission' ? `${restored ? 'Previous debrief. Reward already credited. ' : ''}${mission.debrief}${mission.optionalBonus ? ` Optional cache: ${optional ? 'secured' : 'not destroyed; primary mission still complete'}.` : ''}` : 'All training contacts eliminated. Exercises award no credits.';
    $('next-mission').hidden = this.mode !== 'mission';
    $('next-mission').textContent = this.campaignId < 5 ? `NEXT MISSION / ${missionById(this.campaignId + 1)!.title.toUpperCase()}` : 'CAMPAIGN COMPLETE / MISSION SELECT';
    $('fly-again').focus();
  }

  private enterStage(stage: MissionStage) {
    this.mission.stage = stage;
    const lesson = LESSONS[stage];
    const loadout = this.progress.data.loadouts[this.progress.data.selectedShip]!;
    const describe = (text: string) => text.replace(/pulse cannon/gi, partById(loadout.primary)!.name).replace(/guided missile/gi, loadout.secondary === 'torpedoes' ? 'heavy torpedo' : 'guided missile').replace('Twenty-four rounds per sortie', loadout.secondary === 'torpedoes' ? 'Eight rounds per sortie' : 'Twenty-four rounds per sortie');
    $('objective').textContent = describe(lesson.objective);
    this.radio(lesson.speaker, describe(lesson.line));
    if (stage === 'cannon' || stage === 'missile') this.spawnDrones(1, false);
    if (stage === 'defense') { this.spawnDrones(0, false); this.enemyMissile(this.flight.position.clone().add(new THREE.Vector3(0, 0, -550).applyQuaternion(this.flight.rotation)), true); }
    if (stage === 'focus') this.spawnDrones(0, false);
    if (stage === 'raid') this.spawnDrones(6, true);
  }

  private radio(speaker: string, line: string) {
    $('radio-speaker').textContent = speaker;
    $('radio').textContent = `“${line}”`;
    this.radioHoldUntil = performance.now() + 5000;
    const entry = document.createElement('li'); entry.textContent = `${speaker}: ${line}`;
    $('radio-transcript').append(entry);
    if ($('radio-transcript').children.length > 32) $('radio-transcript').firstElementChild?.remove();
    if (this.preferences.subtitles) this.notice(line);
  }

  private countermeasures() {
    if (this.state !== 'flying' || !this.systems.countermeasures()) return;
    for (const projectile of this.projectiles) if (projectile.side === 'enemy' && projectile.homing && (projectile.victim !== 'objective' || projectile.mesh.position.distanceTo(this.flight.position) < 800)) projectile.age = 100;
    this.explode(this.flight.position, 14);
    this.audio.tone('missile');
    this.notice('COUNTERMEASURES DEPLOYED — MISSILE GUIDANCE BROKEN');
    if (this.mode === 'mission' && this.mission.stage === 'defense') { this.mission.countered = true; this.enterStage('focus'); }
  }

  private activateFocus() {
    if (this.mode === 'mission' && this.campaignId === 1 && !['focus', 'raid'].includes(this.mission.stage)) { this.notice('IMPLANT CHECK PENDING — COMPLETE THE CURRENT LESSON'); return; }
    if (this.state !== 'flying') return;
    if (this.systems.ability === 'phoenix') {
      const targets = phoenixTargets(this.drones.filter((actor) => actor.health > 0 && (actor.hostile || actor.required || this.mode === 'exercise'))
        .map((actor) => ({ target: actor, distance: actor.mesh.position.distanceTo(this.flight.position) })), this.systems.ammo);
      if (!targets.length) { this.notice(this.systems.ammo ? 'PHOENIX — NO TARGETS WITHIN 1,000 M' : 'PHOENIX — MISSILE RACK EMPTY'); return; }
      if (!this.systems.focus() || !this.systems.salvo(targets.length)) return;
      for (const [index, target] of targets.entries()) {
        const mesh = new THREE.Mesh(this.missileGeometry, this.missileMaterial);
        mesh.position.copy(this.flight.position).add(new THREE.Vector3((index - targets.length / 2) * 2, -2, -5).applyQuaternion(this.flight.rotation));
        this.scene.add(mesh);
        const heavy = this.build.missileAmmo === 8;
        mesh.scale.setScalar(heavy ? 1.6 : 1);
        this.projectiles.push({ mesh, velocity: FORWARD.clone().applyQuaternion(this.flight.rotation).multiplyScalar(heavy ? 260 : 420), age: 0,
          target, damage: this.build.secondaryDamage, side: 'player', speed: this.build.secondarySpeed, turn: this.build.secondaryTurn, weapon: 'secondary' });
      }
      this.audio.tone('missile'); this.notice(`PHOENIX — ${targets.length} DISTINCT TARGETS ENGAGED`);
      return;
    }
    if (!this.systems.focus()) return;
    this.audio.tone('focus');
    this.notice(`${abilityById(this.systems.ability)!.name.toUpperCase()} ACTIVE — ${this.systems.ability === 'bloodthirst' ? 'KILLS RESTORE HULL, THEN SHIELDS' : this.systems.ability === 'poison' ? 'PRIMARY HITS INFLICT 5s TOXIN' : 'TARGETING AUGMENTED'}`);
    if (this.mode === 'mission' && this.mission.stage === 'focus') this.mission.focused = true;
  }

  private finish(success: boolean, reason = 'Lion’s hull was destroyed.') {
    if (this.state !== 'flying') return;
    this.state = success ? 'complete' : 'failed';
    this.input.active = false;
    this.input.clear();
    this.input.releaseMouse();
    if (success) {
      let reward = 0;
      if (this.mode === 'mission') {
        this.mission.stage = 'complete';
        $('objective').textContent = 'Sector secure. Return to the debrief.';
        this.radio('TETRAGON 01 · COMMAND', this.campaignId === 5 ? 'The command link is gone. The Vextra is safe. Tetragon, return to Mars together.' : LESSONS.complete.line);
        reward = missionReward(this.campaignId, this.systems.hull / this.build.hull, this.operation?.optionalComplete);
        this.progress.complete(this.runId, reward, this.elapsed, this.campaignId, this.operation?.optionalComplete || false);
        this.updateProgress();
      } else $('objective').textContent = 'All training targets eliminated. Exercise complete.';
      this.audio.tone('complete');
      this.showDebrief(reward, this.elapsed);
    } else {
      $('objective').textContent = 'Signal lost. Restart the sortie or return to title.';
      if (this.mode === 'survival' && this.survival) {
        const run = this.survival;
        $('failure-reason').textContent = `${run.cleared} waves cleared; ${run.kills} ships destroyed; ${Math.floor(run.cleared / 10)} summoner bosses defeated. All run tokens and skills have expired. Campaign credits and saved loadouts are unchanged.`;
        run.end();
      } else $('failure-reason').textContent = `${reason} No credits awarded. Previously earned credits and saved equipment are safe.`;
      $('survival-shop').hidden = true;
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
    this.objectiveSelected = false;
    const alive = this.drones.filter((drone) => drone.health > 0);
    if (!alive.length) return;
    const current = alive.findIndex((drone) => drone === this.drones[this.selected]);
    this.selected = this.drones.indexOf(alive[(current + 1) % alive.length]);
    this.lock = 0;
  }

  private fireCannon() {
    if (this.fireCooldown > 0 || (this.mode === 'mission' && ['flight', 'missile', 'defense', 'focus'].includes(this.mission.stage))) return;
    if (!this.systems.cannon()) return;
    this.fireCooldown = this.build.primaryInterval;
    this.audio.tone('shot');
    const direction = FORWARD.clone().applyQuaternion(this.flight.rotation);
    const origin = this.flight.position.clone().addScaledVector(direction, 10);
    // Small aim-assist cone keeps the low-resolution arcade prototype approachable.
    const target = this.objectiveSelected ? undefined : this.drones[this.selected];
    if (target && target.health > 0) {
      const predicted = target.mesh.position.clone().sub(origin).normalize();
      if (direction.dot(predicted) > Math.cos(THREE.MathUtils.degToRad(this.build.aimCone + (this.systems.ability === 'focus' && this.systems.focusTime > 0 ? 3 : 0)))) direction.lerp(predicted, 0.95).normalize();
    }
    const mesh = new THREE.Mesh(this.laserGeometry, this.laserMaterial);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(FORWARD, direction);
    this.scene.add(mesh);
    this.laserMaterial.color.setHex(this.progress.data.loadouts[this.progress.data.selectedShip]!.primary === 'laser' ? 0x8fdfff : 0xc6ff9b);
    this.projectiles.push({ mesh, velocity: direction.multiplyScalar(this.build.primarySpeed + this.flight.speed), age: 0, damage: this.build.primaryDamage, side: 'player', weapon: 'primary', poison: this.systems.ability === 'poison' && this.systems.focusTime > 0 });
  }

  private fireMissile() {
    if (this.state !== 'flying') return;
    if (this.objectiveSelected) { this.notice(`TRACKING OBJECTIVE — ${keyLabel(this.input.bindings.target)} SELECTS A HOSTILE FOR MISSILE LOCK`); return; }
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
    const heavy = this.build.missileAmmo === 8;
    mesh.scale.setScalar(heavy ? 1.6 : 1);
    this.projectiles.push({ mesh, velocity: FORWARD.clone().applyQuaternion(this.flight.rotation).multiplyScalar(heavy ? 260 : 420), age: 0, target, damage: this.build.secondaryDamage, side: 'player', speed: this.build.secondarySpeed, turn: this.build.secondaryTurn, weapon: 'secondary' });
    this.notice(heavy ? 'HEAVY TORPEDO AWAY' : 'FOX TWO — MISSILE AWAY');
  }

  private hit(drone: Drone, damage: number, credit = true, quiet = false) {
    if (drone.health <= 0) return;
    drone.health = Math.max(0, drone.health - damage);
    if (!quiet || drone.health === 0) { this.audio.tone('hit'); this.explode(drone.mesh.position, drone.health === 0 ? 22 : 4); }
    if (drone.health > 0) return;
    drone.mesh.visible = false;
    if (credit) this.systems.bloodthirstKill();
    // mission.kills is the sortie progress counter, so a self-detonating contact still advances it.
    // Player credit (siphon, notice) is tracked separately via `credit`.
    this.mission.kills++;
    const kills = this.mode === 'exercise' ? this.drones.filter((item) => item.health === 0).length : this.mission.kills;
    this.notice(`${credit ? 'TARGET DESTROYED' : 'CONTACT DETONATED'} — ${drone.label}`);
    if (performance.now() > this.radioHoldUntil) $('radio').textContent = kills >= 4 ? '“Clean work, Lion. Keep the pressure on.”' : '“Confirmed kill. Find your next target.”';
    if (this.survival) {
      // The run log counts destroyed contacts; siphon healing still requires player credit.
      this.survival.kills++;
      if (credit) this.systems.shields = Math.min(this.build.shields, this.systems.shields + this.build.shields * 0.08 * this.survival.skills.siphon);
      if (drone === this.drones[this.selected]) this.cycleTarget();
      return;
    }
    if (this.operation) {
      this.operation.destroyed(drone.kind);
      if (drone === this.drones[this.selected]) this.cycleTarget();
      if (!this.drones.some((actor) => actor.required && actor.health > 0)) this.objectiveSelected = true;
      return;
    }
    if (this.mode === 'exercise' && kills === 8) this.pendingVictory = true;
    else if (this.mode === 'mission' && this.mission.stage === 'cannon') this.pendingStage = 'missile';
    else if (this.mode === 'mission' && this.mission.stage === 'missile') this.pendingStage = 'defense';
    else if (this.mode === 'mission' && this.mission.stage === 'raid' && this.drones.every((item) => item.health === 0)) this.pendingVictory = true;
    else if (drone === this.drones[this.selected]) this.cycleTarget();
  }

  private enemyMissile(origin: THREE.Vector3, practice = false, victim: 'player' | 'objective' = 'player', faction: Faction = 'trusan') {
    const mesh = new THREE.Mesh(this.missileGeometry, faction === 'naurae' ? this.aiMaterial : this.enemyMaterial);
    mesh.position.copy(origin);
    this.scene.add(mesh);
    const target = victim === 'objective' && this.objectiveMesh ? this.objectiveMesh.position : this.flight.position;
    this.projectiles.push({ mesh, velocity: target.clone().sub(origin).normalize().multiplyScalar(practice ? 150 : 230), age: 0, damage: practice ? 30 : 35, side: 'enemy', homing: true, practice, victim });
    this.audio.tone('warning');
  }

  private updateEnemies(dt: number) {
    for (const drone of this.drones) {
      if (this.state !== 'flying') break;
      if (drone.health === 0) continue;
      if (!drone.hostile && drone.kind === 'fighter') {
        drone.mesh.position.copy(drone.origin).add(new THREE.Vector3(Math.sin(this.elapsed * 0.3 + drone.phase) * 40, Math.sin(this.elapsed * 0.45 + drone.phase) * 14, Math.sin(this.elapsed * 0.22 + drone.phase) * 40));
        drone.mesh.rotation.set(0, Math.sin(this.elapsed * 0.3 + drone.phase) * 0.3, Math.sin(this.elapsed * 0.5 + drone.phase) * 0.2);
        if (this.mode === 'mission' && drone.mesh.position.distanceTo(this.flight.position) > 1900) {
          drone.origin.copy(new THREE.Vector3(0, 0, -650).applyQuaternion(this.flight.rotation).add(this.flight.position));
          this.notice('TRAINING DRONE RECALLED TO YOUR FORWARD SECTOR');
        }
        continue;
      }
      if (!drone.hostile) { drone.mesh.rotation.y += dt * 0.15; continue; }
      const victim = drone.attacksObjective && this.operation?.protectedActive && this.objectiveMesh ? 'objective' : 'player';
      const target = victim === 'objective' ? this.objectiveMesh!.position : this.flight.position;
      const distanceToTarget = drone.mesh.position.distanceTo(target);
      // While Lion's systems are hardened after a blast, Naurae cannot start or finish another EMP.
      const empDistance = this.elapsed < this.empSuppressedUntil ? Infinity : drone.mesh.position.distanceTo(this.flight.position);
      const event = tickFaction(drone, dt, empDistance, distanceToTarget);

      if (event === 'emp-charge') {
        this.audio.tone('warning');
        this.notice('NAURAE EMP CHARGING — DESTROY THE SOURCE OR BREAK AWAY');
      } else if (event === 'emp-blast') {
        const result = this.systems.emp(EMP_SHIELD_DRAIN);
        this.empSuppressedUntil = this.elapsed + EMP_SUPPRESSION_SECONDS;
        this.audio.tone('emp');
        this.damageUntil = performance.now() + 350;
        this.explode(this.flight.position, 22);
        this.notice(`NAURAE EMP BLAST — ${Math.round(result.shieldDrain)} SHIELDS LOST, SYSTEMS LOCKED`);
      } else if (event === 'overclock') {
        this.audio.tone('overclock');
        this.notice(`${drone.label} OVERCLOCKING — DESTROY IT OR BREAK AWAY`);
      } else if (event === 'teleport') {
        this.teleportNaurae(drone);
        continue;
      } else if (event === 'detonate') {
        this.detonateTrusan(drone, target, victim);
        continue;
      }

      // A committed Trusan raider stops orbiting and rams its locked target.
      if (drone.overclock > 0) {
        const step = this.scratchStep.copy(target).sub(drone.mesh.position);
        const remaining = step.length();
        drone.mesh.position.addScaledVector(step.normalize(), Math.min(OVERCLOCK_SPEED * dt, remaining));
        drone.mesh.lookAt(target); drone.mesh.rotateY(Math.PI);
        continue;
      }

      if (drone.kind === 'fighter' || drone.kind === 'heavy') {
        const phase = drone.faction === 'naurae' ? drone.id * 0.8 : drone.phase;
        const rate = drone.faction === 'naurae' ? 0.1 : 0.12;
        const orbit = this.scratchOrbit.set(Math.sin(this.elapsed * rate + phase) * 650, Math.sin(this.elapsed * 0.2 + phase) * (drone.faction === 'naurae' ? 85 : 160), Math.cos(this.elapsed * rate + phase) * 650).add(target);
        const step = this.scratchStep.copy(orbit).sub(drone.mesh.position);
        const remaining = step.length();
        drone.mesh.position.addScaledVector(step.normalize(), Math.min((drone.kind === 'heavy' ? 58 : 80) * dt, remaining));
      }
      drone.mesh.lookAt(target); drone.mesh.rotateY(Math.PI);
      const distance = drone.mesh.position.distanceTo(target);
      drone.fireTimer -= dt;
      drone.missileTimer -= dt;
      // A charging Naurae EMP is a visible wind-up: hold fire so the telegraph reads clearly.
      if (drone.empCharge > 0) continue;
      const volley = Math.floor(this.elapsed / 7);
      const coordinated = drone.faction === 'naurae';
      if (distance < 1400 && drone.fireTimer <= 0 && (!coordinated || drone.lastVolley !== volley)) {
        drone.fireTimer = coordinated ? 0 : this.operation || this.survival ? 4.5 + drone.id % 3 : 4.5 + drone.phase;
        drone.lastVolley = volley;
        const aim = this.scratchAim.copy(target);
        if (victim === 'player') aim.addScaledVector(FORWARD.clone().applyQuaternion(this.flight.rotation), this.flight.speed * distance / 520 * (coordinated ? 0.85 : 0.65));
        const mesh = new THREE.Mesh(this.laserGeometry, coordinated ? this.aiMaterial : this.enemyMaterial);
        mesh.position.copy(drone.mesh.position);
        const direction = aim.sub(mesh.position).normalize();
        mesh.quaternion.setFromUnitVectors(FORWARD, direction);
        this.scene.add(mesh);
        this.projectiles.push({ mesh, velocity: direction.multiplyScalar(520), age: 0, damage: drone.kind === 'boss' ? 24 : drone.kind === 'heavy' ? 16 : 12, side: 'enemy', victim });
      }
      if (distance < 1500 && drone.missileTimer <= 0) {
        drone.missileTimer = drone.kind === 'boss' ? 7 : this.operation || this.survival ? 16 + drone.id % 5 : 19 + drone.phase * 2;
        if (drone.kind !== 'turret') this.enemyMissile(drone.mesh.position, false, victim, drone.faction);
      }
    }
  }

  /** Naurae displace to a new firing solution when damaged, breaking an existing missile lock. */
  private teleportNaurae(drone: Drone) {
    if (this.state !== 'flying') return;
    const angle = this.elapsed * 1.9 + drone.id * 0.7;
    const radius = TELEPORT_MIN_RANGE + (drone.id % 4) * (TELEPORT_MAX_RANGE - TELEPORT_MIN_RANGE) / 3;
    const destination = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle * 0.6) * 180, Math.sin(angle) * radius)
      .applyQuaternion(this.flight.rotation).add(this.flight.position);
    this.explode(drone.mesh.position, 16);
    drone.mesh.position.copy(destination);
    drone.origin.copy(destination);
    this.explode(destination, 16);
    this.audio.tone('teleport');
    if (drone === this.drones[this.selected]) this.lock = 0;
    this.notice('NAURAE TELEPORT — CONTACT REACQUIRING');
  }

  /** Trusan overclock fuses end in a proximity warhead rather than a normal kill. */
  private detonateTrusan(drone: Drone, target: THREE.Vector3, victim: 'player' | 'objective') {
    if (this.state !== 'flying' || drone.health <= 0) return;
    const distance = drone.mesh.position.distanceTo(target);
    const damage = overclockDamage(distance);
    this.explode(drone.mesh.position, 34);
    this.audio.tone('hit');
    if (damage > 0) {
      if (victim === 'objective' && this.operation?.protectedActive) this.operation.damageObjective(damage);
      else if (victim === 'player') {
        const result = this.systems.damage(damage);
        this.damageUntil = performance.now() + 350;
        this.notice(`TRUSAN OVERCLOCK DETONATION — ${Math.round(damage)} IMPACT DAMAGE`);
        if (result.destroyed) { this.finish(false); return; }
      }
    }
    this.hit(drone, drone.health, false);
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
      if (this.particles.length >= (this.preferences.reducedEffects ? 32 : 256)) break;
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
      if (projectile.side === 'enemy' && projectile.homing && this.systems.flareTime > 0 && (projectile.victim !== 'objective' || projectile.mesh.position.distanceTo(this.flight.position) < 800)) projectile.age = 100;
      if (projectile.victim === 'objective' && !this.operation?.protectedActive) projectile.age = 100;
      if (projectile.side === 'enemy' && projectile.homing && projectile.age < 100) {
        const target = projectile.victim === 'objective' && this.objectiveMesh ? this.objectiveMesh.position : this.flight.position;
        const desired = target.clone().sub(projectile.mesh.position).normalize().multiplyScalar(projectile.practice ? 180 : 250);
        projectile.velocity.lerp(desired, 1 - Math.exp(-dt * 2.2));
        projectile.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), projectile.velocity.clone().normalize());
      } else if (projectile.target && projectile.target.health > 0) {
        const desired = projectile.target.mesh.position.clone().sub(projectile.mesh.position).normalize().multiplyScalar(projectile.speed || 550);
        projectile.velocity.lerp(desired, 1 - Math.exp(-dt * (projectile.turn || 5)));
        projectile.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), projectile.velocity.clone().normalize());
      }
      const previous = projectile.mesh.position.clone();
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      let hit = false;
      if (projectile.side === 'enemy' && projectile.victim === 'objective' && projectile.age < 100 && this.operation?.protectedActive && this.objectiveMesh && segmentHitsSphere(previous, projectile.mesh.position, this.objectiveMesh.position, this.operation.id === 2 ? 35 : 90)) {
        this.operation.damageObjective(projectile.damage * (this.systems.difficulty === 'assist' ? 0.5 : 1));
        this.explode(projectile.mesh.position, 4); hit = true;
      } else if (projectile.side === 'enemy' && projectile.victim !== 'objective' && projectile.age < 100 && segmentHitsSphere(previous, projectile.mesh.position, this.flight.position, 8)) {
        const result = this.systems.damage(projectile.damage);
        this.damageUntil = performance.now() + 250;
        this.audio.tone('hit');
        if (result.shieldBreak) this.notice('SHIELDS DOWN — BREAK CONTACT TO RECHARGE');
        if (result.destroyed) this.finish(false);
        hit = true;
      }
      for (const drone of this.drones) {
        if (projectile.side === 'enemy') break;
        if (drone.health > 0 && segmentHitsSphere(previous, projectile.mesh.position, drone.mesh.position, drone.radius)) {
          if (projectile.side === 'ally') drone.health = Math.max(35, drone.health - projectile.damage);
          else {
            this.hit(drone, projectile.damage);
            if (projectile.poison && drone.health > 0 && this.poisonEffects.filter((effect) => effect.target === drone).length < 6) this.poisonEffects.push({ target: drone, remaining: 5, pending: 0 });
            if (this.survival && projectile.weapon) {
              const nearby = this.drones.filter((other) => other !== drone && other.health > 0 && other.mesh.position.distanceTo(drone.mesh.position) < 180).sort((a, b) => a.mesh.position.distanceToSquared(drone.mesh.position) - b.mesh.position.distanceToSquared(drone.mesh.position));
              if (projectile.weapon === 'primary' && this.survival.skills.arc) for (const other of nearby.slice(0, 2)) this.hit(other, 15 * this.survival.skills.arc);
              if (projectile.weapon === 'secondary' && this.survival.skills.blast) { this.explode(drone.mesh.position, 12); for (const other of nearby) this.hit(other, projectile.damage * 0.25 * this.survival.skills.blast); }
            }
          }
          hit = true;
          break;
        }
      }
      if (!hit && projectile.side !== 'enemy' && this.operation?.phase === 'relays' && this.commandVessel && segmentHitsSphere(previous, projectile.mesh.position, this.commandVessel.position, 100)) {
        hit = true; this.explode(projectile.mesh.position, 4);
        if (performance.now() > this.noticeUntil) this.notice('MAIN HULL SHIELDED — TARGET THE TWO RELAYS');
      }
      if (hit || projectile.age > (projectile.target || projectile.homing ? 12 : 3)) {
        this.scene.remove(projectile.mesh);
        this.projectiles.splice(i, 1);
      }
    }
    for (let i = this.poisonEffects.length - 1; i >= 0; i--) {
      const effect = this.poisonEffects[i];
      if (effect.target.health <= 0) { this.poisonEffects.splice(i, 1); continue; }
      const step = Math.min(effect.remaining, dt);
      effect.remaining -= step;
      effect.pending += step;
      if (effect.pending >= 0.25 || effect.remaining <= 0) { this.hit(effect.target, 6 * effect.pending, true, true); effect.pending = 0; }
      if (effect.remaining <= 0 || effect.target.health <= 0) this.poisonEffects.splice(i, 1);
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
      const target = this.guidanceTarget();
      const padlock = this.input.padlock && !!target && target.health > 0;
      this.cameraRig.update(this.camera, this.flight.position, this.flight.rotation, padlock && target ? target.mesh.position : undefined, dt);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, this.flight.boosting ? 78 : 65, 4, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private updateModeSimulation(dt: number) {
    const alive = this.drones.filter((actor) => actor.health > 0);
    const required = alive.filter((actor) => actor.required).length;
    if (this.operation && this.state === 'flying') {
      const point = new THREE.Vector3(...this.operation.objectivePosition);
      if (this.objectiveMesh && (this.operation.id !== 5 || this.operation.phase === 'extraction')) this.objectiveMesh.position.copy(point);
      this.operation.update(dt, required, this.flight.position.distanceTo(point));
      this.processOperationEvents();
      if (this.operation.id === 5 && ['relays', 'engines', 'command'].includes(this.operation.phase) && this.commandVessel && this.state === 'flying') {
        this.commandFire -= dt;
        if (this.commandFire <= 0 && this.flight.position.distanceTo(this.commandVessel.position) < 2000) {
          this.commandFire = this.operation.phase === 'engines' ? 9 : 7;
          for (const side of this.operation.phase === 'relays' ? [-60, 60] : [0]) this.enemyMissile(this.commandVessel.position.clone().add(new THREE.Vector3(side, 0, -100)), false, 'player', 'naurae');
        }
      }
    }
    if (this.survival && this.state === 'flying') {
      this.survival.update(dt, required, alive.some((actor) => actor.kind === 'boss'), alive.length);
      this.processSurvivalEvents();
    }
  }

  private updateOperationHud(active: boolean) {
    const op = this.operation;
    $('operation-panel').hidden = !active || !op;
    document.body.classList.toggle('operation-active', active && !!op);
    $('objective-marker').hidden = true;
    if (op && active) {
      const remaining = this.drones.filter((actor) => actor.required && actor.health > 0).length;
      const point = new THREE.Vector3(...op.objectivePosition);
      const distance = Math.round(this.flight.position.distanceTo(point));
      $('operation-label').textContent = op.objectiveLabel;
      $('operation-panel').dataset.health = String(op.objectiveHealth);
      $('operation-panel').dataset.progress = String(op.progress);
      $('operation-panel').dataset.distance = String(distance);
      $('operation-panel').dataset.required = String(remaining);
      $('operation-status').textContent = op.protectedActive ? `HULL ${Math.ceil(op.objectiveHealth)} / ${op.maxObjectiveHealth}` : op.phase === 'salvage' ? `${op.recovery.toFixed(1)} / 45 SECONDS` : `${remaining} PRIMARY CONTACTS`;
      $('operation-bar').style.width = `${op.protectedActive ? op.objectiveHealth / op.maxObjectiveHealth * 100 : op.phase === 'salvage' ? op.progress * 100 : 100}%`;
      $('operation-detail').textContent = op.phase === 'escort' ? `Exit ${Math.floor(op.travel * 100)}% · Ambush ${op.wave + 1}/3 · ${distance} m to Aster${op.optionalComplete ? ' · Cache secured' : ''}`
        : op.phase === 'salvage' ? `${op.contested ? 'CONTESTED — CLEAR HOSTILES' : !op.inZone ? 'OUT OF RANGE — USE G' : 'RECOVERING VEXTRA'} · ${distance} m`
          : op.phase === 'extraction' ? `Payload ${Math.floor(op.progress * 100)}% · Assault ${op.wave + 1}/2 · ${distance} m`
            : `${distance} m · ${op.optionalComplete ? 'Optional cache secured' : op.id === 4 ? 'Optional cache not required' : 'Follow phase directives'}`;
      if (!this.objectiveSelected) {
        const screen = point.clone().project(this.camera);
        if (screen.z < 1 && Math.abs(screen.x) < 0.9 && Math.abs(screen.y) < 0.65) {
          $('objective-marker').hidden = false;
          $('objective-marker').style.left = `${(screen.x * 0.5 + 0.5) * 100}%`;
          $('objective-marker').style.top = `${(-screen.y * 0.5 + 0.5) * 100}%`;
          $('objective-marker').textContent = `${op.id === 2 ? 'ASTER' : op.id === 3 ? 'SALVAGE ZONE' : op.id === 4 ? 'DEPOT' : op.phase === 'extraction' ? 'EXTRACTION' : 'COMMAND VESSEL'} / ${distance} M [G]`;
        }
      }
    }
    const run = this.survival;
    $('survival-hud').hidden = !run || !active;
    if (run) {
      $('survival-wave').textContent = `WAVE ${run.wave} / ${run.phase === 'boss' ? 'SUMMONER' : 'COMBAT'}`;
      $('survival-tokens').textContent = String(run.tokens);
      $('survival-cleared').textContent = String(run.cleared);
      $('survival-equipped').textContent = SKILLS.filter((skill) => run.skills[skill.id] > 0).map((skill) => `${skill.name} ${run.skills[skill.id]}`).join(' / ') || 'NO RUN SKILLS';
      const serialized = JSON.stringify(run.skills);
      if ($('survival-hud').dataset.skills !== serialized) $('survival-hud').dataset.skills = serialized;
    }
    const boss = this.drones.find((actor) => actor.kind === 'boss' && actor.health > 0);
    const bossVisible = active && (!!boss || !!op && op.id === 5 && ['relays', 'engines', 'command'].includes(op.phase));
    $('boss-status').hidden = !bossVisible;
    document.body.classList.toggle('boss-active', bossVisible);
    if (boss) {
      $('boss-label').textContent = boss.label;
      $('boss-phase').textContent = `${Math.ceil(boss.health)} / ${boss.maxHealth} HP · ${run?.summons || 0} SUMMONING BURSTS`;
      $('boss-status').dataset.summons = String(run?.summons || 0);
      $('boss-bar').style.width = `${boss.health / boss.maxHealth * 100}%`;
    } else if (bossVisible && op) {
      $('boss-label').textContent = 'NAURAE / NAURALIS COMMAND VESSEL';
      const nodes = this.drones.filter((actor) => actor.health > 0);
      const core = nodes.find((actor) => actor.kind === 'core');
      $('boss-phase').textContent = op.phase === 'relays' ? `SHIELDED / ${nodes.filter((actor) => actor.kind === 'relay').length} RELAYS REMAIN` : op.phase === 'engines' ? `DRIVES / ${nodes.filter((actor) => actor.kind === 'engine').length} BANKS + ${nodes.filter((actor) => actor.kind === 'fighter').length} ESCORTS` : `CORE EXPOSED / ${Math.ceil(core?.health || 0)} HP`;
      $('boss-bar').style.width = `${core ? core.health / core.maxHealth * 100 : 100}%`;
    }
  }

  private updateHud() {
    const active = this.state === 'flying';
    $('flight-status').textContent = active ? 'LIVE FLIGHT' : this.state.toUpperCase();
    document.body.dataset.missionStage = this.operation?.phase || this.survival?.phase || (this.mode === 'mission' ? this.mission.stage : 'exercise');
    document.body.dataset.operationPhase = this.operation?.phase || '';
    document.body.dataset.wave = String(this.survival?.wave || 0);
    document.body.dataset.mode = this.mode;
    document.body.dataset.missionId = String(this.campaignId);
    document.body.classList.toggle('emp-lockout', active && this.systems.systemsLocked);
    // Sortie totals stay current even on the debrief/failure screen so the last kill is shown.
    $('system-state').textContent = `SORTIE ${clockLabel(this.elapsed)}`;
    $('kills').textContent = String(this.mode === 'exercise' ? this.drones.filter((item) => item.health === 0).length : this.mission.kills).padStart(2, '0');
    $('kill-total').textContent = this.survival ? '/ RUN KILLS' : `/ ${String(this.operation?.totalTargets || 8).padStart(2, '0')} TARGETS`;
    if (!active) {
      // Menu states keep layout boxes but make no flight-HUD writes or projections.
      this.updateOperationHud(false);
      $('missile-warning').hidden = true;
      $('threat-warning').hidden = true;
      document.body.dataset.threat = '';
      $('target-guide').hidden = true;
      $('target-marker').hidden = true;
      $('padlock-status').hidden = true;
      $('mouse-yoke').hidden = true;
      document.body.classList.remove('focus-active', 'damage-flash', 'padlock-view');
      return;
    }
    const drone = this.guidanceTarget();
    const yokeVisible = this.input.settings.mode === 'yoke';
    $('mouse-yoke').hidden = !yokeVisible;
    if (yokeVisible) {
      const x = this.input.mouse.yokeX;
      const y = this.input.mouse.yokeY * (this.input.settings.invertPitch ? -1 : 1);
      $('yoke-dot').style.left = `${50 + x * 44}%`;
      $('yoke-dot').style.top = `${50 - y * 44}%`;
      $('mouse-yoke').dataset.roll = String(x);
      $('mouse-yoke').dataset.pitch = String(y);
      $('mouse-yoke').setAttribute('aria-label', `Mouse yoke: roll ${Math.round(x * 100)}%, pitch ${Math.round(y * 100)}%. Z to recenter.`);
    }
    $('hull').textContent = `${Math.ceil(this.systems.hull)} / ${this.systems.stats.hull}`;
    $('shields').textContent = `${Math.ceil(this.systems.shields)} / ${this.systems.stats.shields}`;
    $('hull-bar').style.width = `${this.systems.hull / this.systems.stats.hull * 100}%`;
    $('shield-bar').style.width = `${this.systems.shields / this.systems.stats.shields * 100}%`;
    $('ammo').textContent = String(this.systems.ammo);
    const locked = this.systems.systemsLocked;
    $('cannon-state').textContent = locked ? `EMP LOCKOUT ${this.systems.empLockout.toFixed(1)}s` : this.systems.overheated ? 'OVERHEATED — COOLING' : `HEAT ${Math.round(this.systems.heat)}% [${keyLabel(this.input.bindings.fire)}]`;
    $('heat-bar').style.width = `${this.systems.heat}%`;
    $('flare-state').textContent = locked ? 'SYSTEMS LOCKED' : this.systems.countermeasureCooldown > 0 ? `${this.systems.countermeasureCooldown.toFixed(1)}s` : 'READY';
    $('focus-name').textContent = abilityById(this.systems.ability)!.name.toUpperCase();
    $('focus-state').textContent = locked ? 'SYSTEMS LOCKED' : this.systems.focusTime > 0 ? `ACTIVE ${this.systems.focusTime.toFixed(1)}s` : this.systems.focusCooldown > 0 ? `${this.systems.focusCooldown.toFixed(1)}s` : 'READY';
    $('focus-bar').style.width = `${this.systems.focusTime > 0 ? this.systems.focusTime / 5 * 100 : (1 - this.systems.focusCooldown / this.build.focusCooldown) * 100}%`;
    document.body.classList.toggle('focus-active', this.systems.ability === 'focus' && this.systems.focusTime > 0);
    document.body.classList.toggle('damage-flash', performance.now() < this.damageUntil);
    $('missile-warning').hidden = !this.projectiles.some((shot) => shot.side === 'enemy' && shot.homing && shot.age < 12);
    const empThreat = this.drones.find((actor) => actor.health > 0 && actor.faction === 'naurae' && actor.empCharge > 0);
    const overclockThreat = empThreat ? undefined : this.drones.find((actor) => actor.health > 0 && actor.faction === 'trusan' && actor.overclock > 0);
    const threat = empThreat || overclockThreat;
    $('threat-warning').hidden = !threat;
    document.body.dataset.threat = empThreat ? 'emp' : overclockThreat ? 'overclock' : '';
    if (threat) {
      $('threat-warning').dataset.kind = empThreat ? 'emp' : 'overclock';
      $('threat-warning').textContent = empThreat
        ? `NAURAE EMP CHARGE — ${empThreat.empCharge.toFixed(1)}s`
        : `TRUSAN OVERCLOCK — DETONATION ${overclockThreat!.overclock.toFixed(1)}s`;
    }
    $('system-state').textContent = `SORTIE ${clockLabel(this.elapsed)}`;
    $('speed').textContent = String(Math.round(this.flight.speed)).padStart(3, '0');
    $('throttle').textContent = `${Math.round(this.flight.throttle * 100)}%`;
    $('boost').textContent = `${Math.round(this.flight.boost / this.flight.stats.boostCapacity * 100)}%`;
    $('boost-bar').style.width = `${this.flight.boost / this.flight.stats.boostCapacity * 100}%`;
    $('drive-state').textContent = this.flight.boosting ? '/ BOOST' : '/ CRUISE';
    $('lock-bar').style.width = `${this.lock * 100}%`;
    $('lock-status').textContent = locked ? 'EMP LOCKOUT — SYSTEMS OFFLINE' : this.systems.ammo === 0 ? 'RACK EMPTY' : this.systems.missileCooldown > 0 ? `RECHARGING ${this.systems.missileCooldown.toFixed(1)}s` : this.lock === 1 ? `LOCK CONFIRMED [${keyLabel(this.input.bindings.missile)}]` : this.lock > 0 ? `ACQUIRING ${Math.floor(this.lock * 100)}%` : 'SEEKING TARGET';
    $('lock-status').classList.toggle('locked', !locked && this.lock === 1);
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
      this.guideColor = guide.color;
      $('target-guide').style.color = guide.color;
      const orientation = guideRotation(this.flight.position, drone.mesh.position, this.camera.quaternion, this.flight.rotation, padlock);
      // Read-only flight-frame bearing complements the camera-relative visual instrument.
      $('target-guide').dataset.flightBearing = drone.mesh.position.clone().sub(this.flight.position).normalize().applyQuaternion(this.flight.rotation.clone().invert()).toArray().join(',');
      $('target-guide').dataset.kind = drone.kind || 'objective';
      $('target-guide').dataset.faction = drone.faction;
      $('target-guide').dataset.required = String(drone.required !== false);
      const attitude = new THREE.Euler().setFromQuaternion(orientation, 'YXZ');
      const degrees = (value: number) => `${Math.round(THREE.MathUtils.radToDeg(value))}°`;
      $('guide-arrow').dataset.orientation = orientation.toArray().join(',');
      $('guide-arrow').setAttribute('aria-label', padlock ? `Ship attitude: pitch ${degrees(attitude.x)}, yaw ${degrees(attitude.y)}, bank ${degrees(attitude.z)}` : guide.behind ? '3D target direction: behind camera' : '3D target direction in camera coordinates');
      $('guide-caption').textContent = padlock ? 'SHIP ATTITUDE / TARGET' : drone.label;
      $('guide-distance').textContent = `${Math.round(guide.distance).toLocaleString()} M`;
      $('guide-bearing').textContent = padlock ? `P ${degrees(attitude.x)} · Y ${degrees(attitude.y)} · B ${degrees(attitude.z)}` : guide.behind ? 'REAR · TURN AROUND' : guide.aligned ? 'AHEAD' : 'TURN TO TARGET';
    }
    if (!marker.hidden && drone) {
      const distance = this.flight.position.distanceTo(drone.mesh.position);
      this.markerPosition.copy(drone.mesh.position).project(this.camera);
      const visible = this.markerPosition.z < 1 && Math.abs(this.markerPosition.x) < 0.91 && Math.abs(this.markerPosition.y) < 0.74;
      marker.hidden = !visible;
      marker.style.left = `${(this.markerPosition.x * 0.5 + 0.5) * 100}%`;
      marker.style.top = `${(-this.markerPosition.y * 0.5 + 0.5) * 100}%`;
      marker.classList.toggle('locked', this.lock === 1);
      marker.dataset.faction = drone.faction;
      $('target-label').textContent = `${drone.faction.toUpperCase()} / ${drone.label}`;
      const layers = contactLayers(drone.health, drone.maxHealth);
      const toxin = this.poisonEffects.filter((effect) => effect.target === drone).length;
      $('target-range').textContent = `${Math.round(distance)} M${drone.faction === 'exavius' ? ' · NAVIGATION' : ` · SH ${Math.ceil(layers.shields / layers.shieldMaximum * 100)}% / HL ${Math.ceil(layers.hull / layers.hullMaximum * 100)}%${toxin ? ` · TOXIN ${toxin}` : ''}`}`;
    }
    if (this.flight.position.length() > 5500 && active) this.notice('SECTOR LIMIT — AUTOPILOT CORRECTING COURSE');
    if (this.mode === 'mission' && active && this.mission.stage === 'flight') {
      $('objective').textContent = `Flight check: ${this.mission.pitch ? '✓' : '□'} pitch · ${this.mission.yaw ? '✓' : '□'} yaw${this.input.settings.mode === 'yoke' ? ` (${keyLabel(this.input.bindings.yawLeft)}/${keyLabel(this.input.bindings.yawRight)})` : ''} · ${this.mission.roll ? '✓' : '□'} roll (${this.input.settings.mode === 'yoke' ? 'mouse or ' : ''}${keyLabel(this.input.bindings.rollLeft)}/${keyLabel(this.input.bindings.rollRight)}) · ${this.mission.boost ? '✓' : '□'} boost (${keyLabel(this.input.bindings.boost)})`;
    }
    this.drawRadar();
    this.updateOperationHud(active);
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
    this.download(JSON.stringify({ ...report, mode: this.mode, missionId: this.mode === 'mission' ? this.campaignId : undefined, missionStage: this.operation?.phase || this.survival?.phase || this.mission.stage, survivalWave: this.survival?.wave, aliveTargets: this.drones.filter((item) => item.health > 0).length }, null, 2), `space-benchmark-${Date.now()}.json`);
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
    for (const drone of this.drones) if (drone.health > 0) contact(drone.mesh.position, drone.faction === 'naurae' ? '#8dcfff' : '#fa9b75', drone === this.drones[this.selected] && !this.objectiveSelected);
    const nav = this.navigationMesh(); if (nav && this.operation) contact(nav.position, '#baff80', this.objectiveSelected);
    context.fillStyle = '#e2f3e7'; context.beginPath(); context.moveTo(65, 40); context.lineTo(61, 48); context.lineTo(69, 48); context.fill();
  }

  private frame(time: number) {
    const rawDt = this.previousTime ? (time - this.previousTime) / 1000 : 0;
    this.previousTime = time;
    if (this.state === 'hangar' || document.hidden) { requestAnimationFrame((next) => this.frame(next)); return; }
    if (this.state === 'flying') {
      if (rawDt > 0) this.metrics.record(rawDt * 1000);
      this.updateAdaptive(rawDt);
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
        if (this.mode === 'mission' && this.campaignId === 1) {
          if (this.mission.flightCheck(controls)) this.enterStage('cannon');
          if (this.mission.stage === 'focus' && this.mission.focused && this.systems.focusTime === 0) {
            this.systems.ability = this.progress.data.selectedAbility;
            this.enterStage('raid');
          }
          if (this.mission.stage === 'raid') this.mission.raidTime += dt;
        }
        this.updateEnemies(dt);
        this.updateWingmates(dt);
        const target = this.drones[this.selected];
        const acquisition = this.build.lockSpeed * (this.systems.ability === 'focus' && this.systems.focusTime > 0 ? 2.5 : 1) * (this.systems.difficulty === 'assist' ? 1.5 : 1);
        this.lock = lockProgress(this.lock, !this.objectiveSelected && !!target && target.health > 0 && canLock(this.flight.position, this.flight.rotation, target.mesh.position, this.build.lockCone), dt * acquisition);
        this.fireCooldown = Math.max(0, this.fireCooldown - dt);
        if (this.input.fire) this.fireCannon();
        this.updateProjectiles(dt);
        if (this.survival?.skills.ion && this.flight.boosting) {
          this.ionTimer -= dt;
          if (this.ionTimer <= 0) { this.ionTimer = 0.5; for (const actor of this.drones) if (actor.health > 0 && actor.mesh.position.distanceTo(this.flight.position) < 110) this.hit(actor, 12 * this.survival.skills.ion); }
        }
        if (this.pendingStage && this.state === 'flying') { const next = this.pendingStage; this.pendingStage = undefined; this.enterStage(next); }
        if (this.state === 'flying') this.updateModeSimulation(dt);
        if (this.pendingVictory && this.state === 'flying') { this.pendingVictory = false; this.finish(true); }
      }
      this.updateShip(Math.min(rawDt, 0.1));
    } else if (this.state === 'standby' || this.state === 'briefing') {
      this.ship.rotation.z = Math.sin(time * 0.0003) * 0.08;
      this.ship.position.y = Math.sin(time * 0.0005) * 0.5;
    }
    this.renderer.render(this.scene, this.camera);
    this.hudElapsed += rawDt;
    if (this.hudElapsed > 1 / 30) { this.updateHud(); this.hudElapsed = 0; }
    const target = this.guidanceTarget();
    if (this.state === 'flying' && target && target.health > 0 && !$('target-guide').hidden && ++this.guideTick >= 2) {
      this.guideTick = 0;
      this.guideBounds ||= $('guide-arrow').getBoundingClientRect();
      const padlock = this.input.padlock;
      this.guide.render(this.renderer, this.guideBounds, guideRotation(this.flight.position, target.mesh.position, this.camera.quaternion, this.flight.rotation, padlock), this.guideColor);
    }
    requestAnimationFrame((next) => this.frame(next));
  }
}
