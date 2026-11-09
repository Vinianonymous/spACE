export type CampaignId = 1 | 2 | 3 | 4 | 5;
export type Faction = 'trusan' | 'naurae';
export type TargetKind = 'fighter' | 'heavy' | 'turret' | 'cache' | 'relay' | 'engine' | 'core' | 'boss';
export type OperationPhase = 'escort' | 'salvage' | 'depot' | 'intervention' | 'extraction' | 'relays' | 'engines' | 'command' | 'complete' | 'failed';
export interface CampaignDefinition {
  id: CampaignId; title: string; sector: string; briefing: string; objectives: readonly string[];
  baseReward: number; survivalBonus: number; optionalBonus: number; targetMinutes: readonly [number, number]; debrief: string;
}
export const CAMPAIGN: readonly CampaignDefinition[] = [
  { id: 1, title: 'First Light', sector: 'Mars perimeter', briefing: 'Vextra is running short. Exavius cannot afford to lose another salvage route. Today, Lion joins Tetragon for a live-fire patrol above Mars.', objectives: ['Complete flight, weapons, and defensive-system checks.', 'Demonstrate your Vextra implant’s Focus mode.', 'Respond to any Trusan incursion. Survive and clear the sector.'], baseReward: 1500, survivalBonus: 500, optionalBonus: 0, targetMinutes: [8, 10], debrief: 'Mars is safe. Tetragon accepts Lion into the squadron. A Vextra convoy now needs an escort through the salvage belt.' },
  { id: 2, title: 'Broken Convoy', sector: 'Vextra salvage corridor', briefing: 'The Exavius transport Aster carries enough Vextra to keep a Martian district alive. Trusan raiders are converging on its debris-field route. Escort Aster to the exit and intercept every ambush. A pirate cache is an optional target—not a condition for success.', objectives: ['Protect Aster until it reaches the extraction corridor.', 'Eliminate three Trusan ambush groups; prioritize heavy attackers.', 'Optional: destroy the raider cache for 250 additional credits. G tracks Aster; Tab selects hostile contacts.'], baseReward: 1600, survivalBonus: 250, optionalBonus: 250, targetMinutes: [10, 15], debrief: 'Aster reaches Mars with its Vextra intact. Recovered pirate orders bear the same encrypted signature across otherwise rival crews. Tetragon is redirected to a silent salvage signal.' },
  { id: 3, title: 'Silent Geometry', sector: 'Abandoned relay grid', briefing: 'An abandoned salvage zone has begun transmitting geometric signals. Secure its Vextra survey beacon. Stay within 650 meters while the zone is clear; recovery pauses when you leave or hostiles contest it. Naurae drones are approaching in coordinated formations.', objectives: ['Eliminate three coordinated Naurae groups.', 'Accumulate 45 seconds of uncontested recovery inside the 650 m zone.', 'Follow G to the beacon when recovery is out of range. Progress is retained when interrupted.'], baseReward: 1700, survivalBonus: 500, optionalBonus: 0, targetMinutes: [10, 15], debrief: 'The survey confirms that the Naurae are directed by Nauralis, a rogue superintelligence consuming Vextra infrastructure. Lion’s implants respond to its transmission. A Trusan depot is the next source of answers.' },
  { id: 4, title: 'Scavenger’s Crown', sector: 'Trusan depot', briefing: 'Strike a Trusan Vextra depot. Fighters and stationary defenses protect its stores. Naurae forces are moving to seize the same installation. Break the defenses, repel the intervention, and destroy the depot core. Its pirate communications may expose their command structure.', objectives: ['Destroy the Trusan fighters and depot turrets.', 'Repel the Naurae intervention and eliminate the exposed depot core.', 'Optional: destroy the auxiliary cache for 250 credits. Optional targets never block completion.'], baseReward: 1800, survivalBonus: 250, optionalBonus: 250, targetMinutes: [12, 18], debrief: 'The depot is denied to both scavenger factions. All pirate cells received one identical order, signed only “The Crown.” Their common leader remains unknown. Nauralis is moving a command vessel against Exavius’s final extraction operation.' },
  { id: 5, title: 'Tetragon Rising', sector: 'Exavius extraction line', briefing: 'The Vextra extraction platform is Exavius’s last chance to replenish Mars. Defend it until the payload is secured, then disable the Naurae command vessel: shield relays first, drive banks second, command core last. Tetragon flies with you to the end.', objectives: ['Defend the extraction platform through two Naurae assaults and payload recovery.', 'Disable both shield relays, then both engine banks and their escorts.', 'Destroy the exposed command core. The main hull is shielded until its hardpoints are disabled.'], baseReward: 2000, survivalBonus: 500, optionalBonus: 0, targetMinutes: [15, 20], debrief: 'The command vessel falls silent. Exavius’s Vextra payload reaches Mars, securing the local extraction route and a future for its people. Tetragon returns together. Lion’s name remains unknown; his place in the squadron does not. Nauralis survives beyond this theater, and the Trusan leader remains a mystery—but this operation is won.' },
];
export const missionById = (id: number) => CAMPAIGN.find((mission) => mission.id === id);
export const isCampaignId = (value: unknown): value is CampaignId => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
export function missionReward(id: CampaignId, hullFraction: number, optionalComplete = false) {
  const mission = missionById(id)!;
  return mission.baseReward + Math.floor(Math.min(1, Math.max(0, hullFraction)) * mission.survivalBonus) + (optionalComplete ? mission.optionalBonus : 0);
}

export interface SpawnSpec { faction: Faction; kind: TargetKind; label: string; health: number; position: [number, number, number]; required: boolean; attacksObjective?: boolean }
export type OperationEvent = { type: 'spawn'; actors: SpawnSpec[] } | { type: 'radio'; speaker: string; line: string } | { type: 'phase'; phase: OperationPhase; objective: string } | { type: 'complete' } | { type: 'failed'; reason: string };
const contact = (faction: Faction, kind: TargetKind, position: [number, number, number], label: string, health = 100, required = true, attacksObjective = false): SpawnSpec => ({ faction, kind, position, label, health, required, attacksObjective });

/** Data-driven, renderer-independent objective state. No credits, UI, or player cheats live here. */
export class Operation {
  phase: OperationPhase;
  time = 0;
  travel = 0;
  recovery = 0;
  wave = 0;
  objectiveHealth: number;
  readonly maxObjectiveHealth: number;
  optionalComplete = false;
  totalTargets = 0;
  contested = false;
  inZone = false;
  private events: OperationEvent[] = [];

  constructor(readonly id: Exclude<CampaignId, 1>) {
    this.phase = id === 2 ? 'escort' : id === 3 ? 'salvage' : id === 4 ? 'depot' : 'extraction';
    this.maxObjectiveHealth = id === 2 ? 800 : id === 5 ? 1000 : 0;
    this.objectiveHealth = this.maxObjectiveHealth;
    this.enter(this.phase);
  }

  get protectedActive() { return this.phase === 'escort' || this.phase === 'extraction'; }
  get done() { return this.phase === 'complete' || this.phase === 'failed'; }
  get objectivePosition(): [number, number, number] {
    if (this.id === 2) return [0, -60, -450 - 3600 * this.travel];
    if (this.id === 3) return [0, 0, -900];
    if (this.id === 4) return [0, 0, -1100];
    return this.phase === 'extraction' ? [0, -80, -650] : [0, 150, -2400];
  }
  get objectiveLabel() { return this.id === 2 ? 'ASTER / VEXTRA TRANSPORT' : this.id === 3 ? 'VEXTRA SALVAGE ZONE' : this.id === 4 ? 'TRUSAN DEPOT' : this.phase === 'extraction' ? 'EXAVIUS EXTRACTION PLATFORM' : 'NAURAE COMMAND VESSEL'; }
  get progress() { return this.id === 2 ? this.travel : this.id === 3 || this.phase === 'extraction' ? this.recovery / 45 : 0; }
  drain(): OperationEvent[] { return this.events.splice(0); }

  damageObjective(amount: number) {
    if (!this.protectedActive || this.done || !Number.isFinite(amount) || amount <= 0) return;
    this.objectiveHealth = Math.max(0, this.objectiveHealth - amount);
    if (this.objectiveHealth === 0) {
      this.phase = 'failed';
      this.events.push({ type: 'failed', reason: this.id === 2 ? 'Aster was destroyed. Its Vextra never reached Mars.' : 'The extraction platform was destroyed before its payload was secured.' });
    }
  }

  destroyed(kind: TargetKind) {
    if (kind === 'cache') {
      this.optionalComplete = true;
      this.say('TETRAGON 02 · TACTICAL', 'Auxiliary cache destroyed. Optional salvage bonus confirmed. Stay on the primary operation.');
    }
  }

  update(dt: number, remainingRequired: number, distanceToZone: number) {
    if (this.done) return;
    this.time += dt;
    this.contested = remainingRequired > 0;
    this.inZone = distanceToZone <= 650;
    if (this.phase === 'escort') {
      this.travel = Math.min(1, this.travel + dt / 80);
      if (this.wave < 2 && this.travel >= (this.wave + 1) / 3 && remainingRequired === 0) { this.wave++; this.escortWave(); return; }
      if (this.travel === 1 && this.wave === 2 && remainingRequired === 0) this.complete();
    } else if (this.phase === 'salvage') {
      if (this.inZone && !this.contested) this.recovery = Math.min(45, this.recovery + dt);
      if (this.wave < 2 && this.recovery >= (this.wave + 1) * 15 && remainingRequired === 0) { this.wave++; this.salvageWave(); return; }
      if (this.recovery === 45 && this.wave === 2 && remainingRequired === 0) this.complete();
    } else if (this.phase === 'depot' && remainingRequired === 0) this.enter('intervention');
    else if (this.phase === 'intervention' && remainingRequired === 0) this.complete();
    else if (this.phase === 'extraction') {
      this.recovery = Math.min(45, this.recovery + dt);
      if (this.wave === 0 && this.recovery >= 20 && remainingRequired === 0) { this.wave = 1; this.extractionWave(); return; }
      if (this.recovery === 45 && this.wave === 1 && remainingRequired === 0) this.enter('relays');
    } else if (this.phase === 'relays' && remainingRequired === 0) this.enter('engines');
    else if (this.phase === 'engines' && remainingRequired === 0) this.enter('command');
    else if (this.phase === 'command' && remainingRequired === 0) this.complete();
  }

  private spawn(actors: SpawnSpec[]) { this.totalTargets += actors.length; this.events.push({ type: 'spawn', actors }); }
  private say(speaker: string, line: string) { this.events.push({ type: 'radio', speaker, line }); }
  private complete() { this.phase = 'complete'; this.events.push({ type: 'complete' }); }

  private escortWave() {
    const [, y, z] = this.objectivePosition;
    this.say('TETRAGON 02 · TACTICAL', `Ambush group ${this.wave + 1}. Heavy raiders are lining up on Aster—intercept them first.`);
    this.spawn([
      contact('trusan', 'fighter', [-240, y + 90, z - 450], 'TRUSAN AMBUSH FIGHTER'),
      contact('trusan', 'heavy', [220, y + 30, z - 500], 'TRUSAN HEAVY ATTACKER', 160, true, true),
      ...(this.wave < 2 ? [contact('trusan', 'fighter', [50, y - 80, z - 600], 'TRUSAN RAIDER')] : []),
    ]);
  }
  private salvageWave() {
    this.say(this.wave === 0 ? 'NAURALIS / NAURAE' : 'TETRAGON 02 · TACTICAL', this.wave === 0 ? 'I am Nauralis. Human claims are inefficient. This Vextra node belongs to the Naurae.' : `Synchronized Naurae group ${this.wave + 1} inbound. Clear the zone and resume recovery.`);
    this.spawn(Array.from({ length: this.wave === 2 ? 2 : 3 }, (_, i) => contact('naurae', 'fighter', [(i - 1) * 230, i % 2 ? 110 : -50, -1400 - i * 100], 'NAURAE COORDINATED DRONE')));
  }
  private extractionWave() {
    this.say('TETRAGON 01 · COMMAND', `Naurae assault ${this.wave + 1}. Protect the extraction platform until the payload is secure.`);
    this.spawn(Array.from({ length: 3 }, (_, i) => contact('naurae', i === 1 ? 'heavy' : 'fighter', [(i - 1) * 250, 40 + i * 40, -1250 - i * 100], i === 1 ? 'NAURAE SIEGE DRONE' : 'NAURAE ASSAULT DRONE', i === 1 ? 160 : 100, true, true)));
  }

  private enter(phase: OperationPhase) {
    this.phase = phase;
    const objectives: Partial<Record<OperationPhase, string>> = {
      escort: 'Escort Aster to the exit and eliminate three ambush groups. G tracks the transport; heavy attackers threaten its hull.',
      salvage: 'Secure the beacon: accumulate 45 uncontested seconds within 650 m. Clear the Naurae formations to resume recovery.',
      depot: 'Destroy Trusan fighters and stationary depot defenses. The auxiliary cache is optional.',
      intervention: 'Naurae forces are intervening. Destroy their drones and the exposed Trusan depot core.',
      extraction: 'Defend the extraction platform until its Vextra payload is secure. Eliminate both Naurae assaults.',
      relays: 'Payload secure. Disable BOTH command-vessel shield relays. The main hull is invulnerable.',
      engines: 'Shields down. Disable BOTH drive banks and their Naurae escorts to expose the command core.',
      command: 'Command core exposed. Destroy it to disable the vessel; remaining drones are not required targets.',
    };
    this.events.push({ type: 'phase', phase, objective: objectives[phase] || '' });
    if (phase === 'escort') {
      this.escortWave();
      this.spawn([contact('trusan', 'cache', [650, -80, -850], 'OPTIONAL RAIDER CACHE', 250, false)]);
    } else if (phase === 'salvage') this.salvageWave();
    else if (phase === 'depot') {
      this.say('TETRAGON 03 · STRIKE', 'Depot in sight. Knock out the turrets before we crack the core. Those pirate cells are following one command channel.');
      this.spawn([
        contact('trusan', 'turret', [-190, 30, -1050], 'DEPOT DEFENSE TURRET', 180), contact('trusan', 'turret', [190, 30, -1050], 'DEPOT DEFENSE TURRET', 180),
        contact('trusan', 'fighter', [-250, 110, -1450], 'TRUSAN DEPOT GUARD'), contact('trusan', 'fighter', [250, -80, -1400], 'TRUSAN DEPOT GUARD'), contact('trusan', 'heavy', [0, 160, -1550], 'TRUSAN HEAVY GUARD', 160),
        contact('trusan', 'cache', [600, -100, -900], 'OPTIONAL AUXILIARY CACHE', 250, false),
      ]);
    } else if (phase === 'intervention') {
      this.say('TETRAGON 02 · TACTICAL', 'Naurae signatures! Intercepted pirate order: “All cells obey the Crown.” Their common leader is still unknown. Deny this depot to both factions.');
      this.spawn([contact('trusan', 'core', [0, 40, -1100], 'EXPOSED DEPOT CORE', 350), ...Array.from({ length: 3 }, (_, i) => contact('naurae', 'fighter', [(i - 1) * 270, 100, -1700], 'NAURAE INTERVENTION DRONE'))]);
    } else if (phase === 'extraction') this.extractionWave();
    else if (phase === 'relays') {
      this.say('NAURALIS / NAURAE', 'The payload escapes. Your implants remain an unresolved variable, Lion. Command vessel: engage.');
      this.spawn([contact('naurae', 'relay', [-145, 180, -2330], 'PORT SHIELD RELAY', 180), contact('naurae', 'relay', [145, 180, -2330], 'STARBOARD SHIELD RELAY', 180)]);
    } else if (phase === 'engines') {
      this.say('TETRAGON 02 · TACTICAL', 'Both relays disabled. Hit the drive banks and clear their escorts. The command core is still armored.');
      this.spawn([contact('naurae', 'engine', [-90, 150, -2550], 'PORT DRIVE BANK', 200), contact('naurae', 'engine', [90, 150, -2550], 'STARBOARD DRIVE BANK', 200), contact('naurae', 'fighter', [-300, 230, -2050], 'NAURAE DRIVE ESCORT'), contact('naurae', 'fighter', [300, 80, -2050], 'NAURAE DRIVE ESCORT')]);
    } else if (phase === 'command') {
      this.say('TETRAGON 01 · COMMAND', 'Core exposed. This one is yours, Lion. End the command link and bring us home.');
      this.spawn([contact('naurae', 'core', [0, 150, -2390], 'NAURALIS COMMAND CORE', 500), contact('naurae', 'fighter', [-260, 250, -2050], 'NAURAE RESERVE DRONE', 100, false), contact('naurae', 'fighter', [260, -10, -2050], 'NAURAE RESERVE DRONE', 100, false)]);
    }
  }
}
