export type CampaignId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type Faction = 'trusan' | 'naurae';
export type TargetKind = 'fighter' | 'heavy' | 'turret' | 'cache' | 'relay' | 'engine' | 'core' | 'boss' | 'transport' | 'asteroid' | 'laser';
export type OperationPhase = 'escort' | 'salvage' | 'depot' | 'intervention' | 'extraction' | 'relays' | 'engines' | 'command' | 'march' | 'laser' | 'ring' | 'factory' | 'hypr' | 'intercept' | 'scourge' | 'signal' | 'evacuation' | 'crown' | 'complete' | 'failed';
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
  { id: 6, title: 'Long March', sector: '400 miles from home / Pluto approach', briefing: 'Four Exavius motherships and three escort squads are bound for Pluto. Naurae and Trusan rogues attack through a field of drifting asteroids. A concealed Naurae laser ship is charging cryogenic tanks: find it before it fires on the fleet.', objectives: ['Defend all four motherships while the fleet crosses the approach.', 'Clear three mixed ambushes and rogue asteroids.', 'Locate the hidden laser ship within 650 m and destroy it before its charge reaches zero. G tracks the fleet.'], baseReward: 2200, survivalBonus: 500, optionalBonus: 0, targetMinutes: [12, 18], debrief: 'All four motherships reach Pluto. The laser ship is silent, but its targeting orders point to a Naurae factory inside the rings of Uranus.' },
  { id: 7, title: 'Lion’s Roar', sector: 'Uranus rings / Naurae base', briefing: 'Lion leads Tetragon against a ring-borne Naurae shipyard. Anti-ship batteries and AA turrets cover its cube-shaped production core. Unarmed transports ferry Vextra to the factory; stop the supply line before it can reinforce the base.', objectives: ['Destroy the ring defenses and intercept unarmed supply transports.', 'Destroy the production cube before it deploys endless reinforcements.', 'Survive the factory’s Naurae response.'], baseReward: 2400, survivalBonus: 500, optionalBonus: 0, targetMinutes: [12, 18], debrief: 'The ring factory is destroyed. Captured traffic reveals IronFist, a Trusan commander with authorization for the First Scourge, heading for the asteroid belt.' },
  { id: 8, title: 'Supernova', sector: 'Mars orbit / asteroid belt', briefing: 'IronFist is escaping Mars orbit toward the asteroid belt. He carries the authorization to fire the First Scourge at Mars and Exavius. Tetragon fits Lion’s ship with an experimental HYPR drive for a single rapid intercept.', objectives: ['Engage HYPR by boosting for two seconds within 650 m of the intercept marker (G).', 'Destroy IronFist’s escorts and disable his command ship.', 'Stop the First Scourge launch before the authorization countdown expires.'], baseReward: 2600, survivalBonus: 600, optionalBonus: 0, targetMinutes: [10, 15], debrief: 'IronFist’s authorization is revoked. The First Scourge remains armed; a remote control signal is still reaching it through the belt.' },
  { id: 9, title: 'Ghost Signal', sector: 'Asteroid belt / hidden relay array', briefing: 'Nauralis has hijacked the First Scourge’s remote command path. Follow the signal into the belt, break its shield relays, and destroy the transmitter before it can rearm the weapon.', objectives: ['Disable both shield relays.', 'Destroy the exposed transmitter and its defenders.', 'Keep the Scourge command link offline.'], baseReward: 2800, survivalBonus: 600, optionalBonus: 0, targetMinutes: [10, 15], debrief: 'The Scourge loses remote guidance, but its damaged reactor is falling toward a crowded Exavius evacuation route.' },
  { id: 10, title: 'Scorched Orbit', sector: 'Mars evacuation lane', briefing: 'Four civilian carriers are fleeing the Scourge debris. Trusan loyalists want the convoy destroyed before its passengers can testify. Hold the lane until every carrier escapes.', objectives: ['Protect the evacuation convoy through three ambushes.', 'Intercept heavy attackers targeting the carriers.', 'Keep the convoy intact until extraction.'], baseReward: 3000, survivalBonus: 600, optionalBonus: 0, targetMinutes: [12, 18], debrief: 'The civilians escape with evidence that the Crown has been directing both the pirates and the Scourge operation.' },
  { id: 11, title: 'Crownfall', sector: 'Pluto shadow / Crown command', briefing: 'Tetragon traces the Crown to a command bastion beyond Pluto. Its shield relays protect a heavily armed core. Break the relays, silence the command ship, and end the attack on Exavius.', objectives: ['Disable the Crown’s shield relays and escorts.', 'Destroy the exposed command core.', 'Return with the fleet to Pluto.'], baseReward: 3500, survivalBonus: 750, optionalBonus: 0, targetMinutes: [15, 20], debrief: 'The Crown’s command network collapses. The Pluto fleet and the people of Mars survive. Tetragon returns together, and Lion’s long march is finally over.' },
];
export const LAST_MISSION = CAMPAIGN.length as CampaignId;
export const missionById = (id: number) => CAMPAIGN.find((mission) => mission.id === id);
export const isCampaignId = (value: unknown): value is CampaignId => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= LAST_MISSION;
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
  /** Seconds until an enemy superweapon is ready. Pauses only on mission failure or completion. */
  deadline = 0;
  discovered = false;
  private events: OperationEvent[] = [];

  constructor(readonly id: Exclude<CampaignId, 1>) {
    this.phase = id === 2 ? 'escort' : id === 3 ? 'salvage' : id === 4 ? 'depot' : id === 5 ? 'extraction' : id === 6 ? 'march' : id === 7 ? 'ring' : id === 8 ? 'hypr' : id === 9 ? 'signal' : id === 10 ? 'evacuation' : 'crown';
    this.maxObjectiveHealth = id === 2 ? 800 : id === 5 ? 1000 : id === 6 || id === 10 ? 1600 : 0;
    this.objectiveHealth = this.maxObjectiveHealth;
    if (id === 6) this.deadline = 165;
    if (id === 8) this.deadline = 170;
    this.enter(this.phase);
  }

  get protectedActive() { return ['escort', 'extraction', 'march', 'laser', 'evacuation'].includes(this.phase); }
  get laserPosition(): [number, number, number] { return [850, 160, -2100]; }
  get done() { return this.phase === 'complete' || this.phase === 'failed'; }
  get objectivePosition(): [number, number, number] {
    if (this.id === 2) return [0, -60, -450 - 3600 * this.travel];
    if (this.id === 3) return [0, 0, -900];
    if (this.id === 4) return [0, 0, -1100];
    if (this.id === 6 || this.id === 10) return [0, -60, -450 - 3200 * this.travel];
    if (this.id === 7) return [0, 0, -1400];
    if (this.id === 8) return [0, 0, this.phase === 'hypr' ? -2600 : -1850];
    if (this.id === 9 || this.id === 11) return [0, 0, -1850];
    return this.phase === 'extraction' ? [0, -80, -650] : [0, 150, -2400];
  }
  get objectiveLabel() { return this.id === 2 ? 'ASTER / VEXTRA TRANSPORT' : this.id === 3 ? 'VEXTRA SALVAGE ZONE' : this.id === 4 ? 'TRUSAN DEPOT' : this.id === 6 ? 'EXAVIUS FLEET / FOUR MOTHERSHIPS' : this.id === 7 ? 'NAURAE RING FACTORY' : this.id === 8 ? 'HYPR INTERCEPT VECTOR' : this.id === 9 ? 'SCOURGE SIGNAL ARRAY' : this.id === 10 ? 'EXAVIUS EVACUATION CONVOY' : this.id === 11 ? 'CROWN COMMAND BASTION' : this.phase === 'extraction' ? 'EXAVIUS EXTRACTION PLATFORM' : 'NAURAE COMMAND VESSEL'; }
  get progress() { return [2, 6, 10].includes(this.id) ? this.travel : this.id === 3 || this.phase === 'extraction' ? this.recovery / 45 : this.phase === 'hypr' ? this.recovery / 2 : 0; }
  drain(): OperationEvent[] { return this.events.splice(0); }

  damageObjective(amount: number) {
    if (!this.protectedActive || this.done || !Number.isFinite(amount) || amount <= 0) return;
    this.objectiveHealth = Math.max(0, this.objectiveHealth - amount);
    if (this.objectiveHealth === 0) {
      this.phase = 'failed';
      this.events.push({ type: 'failed', reason: this.id === 2 ? 'Aster was destroyed. Its Vextra never reached Mars.' : this.id === 6 ? 'The four-mothership fleet was lost before reaching Pluto.' : this.id === 10 ? 'The evacuation convoy was lost.' : 'The extraction platform was destroyed before its payload was secured.' });
    }
  }

  destroyed(kind: TargetKind) {
    if (this.id === 6 && kind === 'laser') this.deadline = 0;
    if (kind === 'cache') {
      this.optionalComplete = true;
      this.say('TETRAGON 02 · TACTICAL', 'Auxiliary cache destroyed. Optional salvage bonus confirmed. Stay on the primary operation.');
    }
  }

  /** The laser ship is concealed until Lion flies close enough to identify its cryogenic signature. */
  discover(distance: number) {
    if (this.phase !== 'laser' || this.discovered || this.done || distance > 650) return;
    this.discovered = true;
    this.say('TETRAGON 02 · TACTICAL', 'Cryogenic signature confirmed! Laser ship exposed. Destroy it before the tanks finish charging.');
    this.spawn([contact('naurae', 'laser', this.laserPosition, 'NAURAE CRYOGENIC LASER SHIP', 600, true, true)]);
  }

  update(dt: number, remainingRequired: number, distanceToZone: number, boosting = false) {
    if (this.done) return;
    this.time += dt;
    if (this.deadline > 0) {
      this.deadline = Math.max(0, this.deadline - dt);
      if (this.deadline === 0) {
        this.phase = 'failed';
        this.events.push({ type: 'failed', reason: this.id === 6 ? 'The concealed laser ship fired on the motherships.' : 'IronFist authorized the First Scourge. Mars was hit.' });
        return;
      }
    }
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
    } else if (this.phase === 'relays' && remainingRequired === 0) this.enter(this.id === 9 ? 'command' : 'engines');
    else if (this.phase === 'engines' && remainingRequired === 0) this.enter('command');
    else if (this.phase === 'command' && remainingRequired === 0) this.complete();
    else if (this.phase === 'march' || this.phase === 'evacuation' || this.phase === 'laser') {
      this.travel = Math.min(1, this.travel + dt / 90);
      if (this.phase !== 'laser' && this.wave < 2 && this.travel >= (this.wave + 1) / 3 && remainingRequired === 0) {
        this.wave++; this.convoyWave(); return;
      }
      if (this.id === 6 && this.travel >= 0.75 && this.wave === 2 && this.phase === 'march' && remainingRequired === 0) { this.enter('laser'); return; }
      if (this.travel === 1 && remainingRequired === 0 && (this.id === 10 ? this.wave === 2 : this.phase === 'laser' && this.discovered && this.deadline === 0)) this.complete();
    } else if (this.phase === 'ring' && remainingRequired === 0) this.enter('factory');
    else if (this.phase === 'factory') {
      this.recovery += dt;
      if (this.recovery >= 18 && remainingRequired > 0) { this.recovery = 0; if (this.wave < 3) { this.wave++; this.factoryWave(); } }
      if (remainingRequired === 0) this.complete();
    } else if (this.phase === 'hypr') {
      // Boosting near the vector charges the one-use HYPR drive; mere waiting cannot skip the intercept.
      if (this.inZone && boosting) this.recovery = Math.min(2, this.recovery + dt);
      if (this.recovery === 2) this.enter('intercept');
    } else if (this.phase === 'intercept' && remainingRequired === 0) this.enter('scourge');
    else if (this.phase === 'scourge' && remainingRequired === 0) this.complete();
    else if (this.phase === 'signal' && remainingRequired === 0) this.enter('relays');
    else if (this.phase === 'crown' && remainingRequired === 0) this.enter('command');
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

  private convoyWave() {
    const [, y, z] = this.objectivePosition;
    this.say('TETRAGON 01 · COMMAND', `${this.id === 6 ? 'Pluto fleet' : 'Evacuation convoy'}: attack group ${this.wave + 1} incoming. Three other squads are holding the flanks. Protect the carriers!`);
    this.spawn([
      contact(this.id === 6 && this.wave % 2 === 0 ? 'naurae' : 'trusan', 'heavy', [-250, y + 80, z - 550], 'CONVOY HEAVY ATTACKER', 170, true, true),
      contact(this.id === 6 ? 'naurae' : 'trusan', 'fighter', [230, y - 60, z - 600], 'CONVOY INTERCEPTOR', 100, true, true),
      ...(this.id === 6 ? [contact('trusan', 'asteroid', [70, y + 130, z - 420], 'ROGUE ASTEROID', 180)] : []),
    ]);
  }

  private factoryWave() {
    this.say('TETRAGON 03 · STRIKE', 'The production cube is assembling more drones! Hit the core to stop them.');
    this.spawn([contact('naurae', 'fighter', [-240, 90, -1700], 'FACTORY REINFORCEMENT', 90, false), contact('naurae', 'fighter', [240, -30, -1650], 'FACTORY REINFORCEMENT', 90, false)]);
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
      march: 'Defend four motherships en route to Pluto. Clear three attack groups and rogue asteroids. Search for the hidden laser ship.',
      laser: 'Search near the cryogenic signature 850 m right of the route, 2,100 m ahead. Fly within 650 m to reveal and destroy the laser ship before it fires.',
      ring: 'Break the Uranus ring defenses and stop unarmed Naurae Vextra transports.',
      factory: 'Destroy the production cube before it can deploy more reinforcements.',
      hypr: 'Reach the HYPR vector (G), then boost within 650 m for two seconds to engage the drive.',
      intercept: 'HYPR jump complete. Destroy IronFist’s escorts and disable his command ship before the Scourge fires.',
      scourge: 'IronFist disabled. Destroy the First Scourge authorization module before the countdown expires.',
      signal: 'Break the Naurae defenders guarding the hidden command array.',
      evacuation: 'Escort four civilian carriers through three Trusan ambushes. Do not lose the convoy.',
      crown: 'Disable both shield relays and their escorts to expose the Crown command core.',
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
      this.say('NAURALIS / NAURAE', this.id === 9 ? 'The First Scourge is mine. Your resistance is a statistical anomaly.' : 'The payload escapes. Your implants remain an unresolved variable, Lion. Command vessel: engage.');
      this.spawn(this.id === 9 ? [contact('naurae', 'relay', [-160, 50, -1850], 'PORT SIGNAL SHIELD RELAY', 200), contact('naurae', 'relay', [160, 50, -1850], 'STARBOARD SIGNAL SHIELD RELAY', 200)] : [contact('naurae', 'relay', [-145, 180, -2330], 'PORT SHIELD RELAY', 180), contact('naurae', 'relay', [145, 180, -2330], 'STARBOARD SHIELD RELAY', 180)]);
    } else if (phase === 'engines') {
      this.say('TETRAGON 02 · TACTICAL', 'Both relays disabled. Hit the drive banks and clear their escorts. The command core is still armored.');
      this.spawn([contact('naurae', 'engine', [-90, 150, -2550], 'PORT DRIVE BANK', 200), contact('naurae', 'engine', [90, 150, -2550], 'STARBOARD DRIVE BANK', 200), contact('naurae', 'fighter', [-300, 230, -2050], 'NAURAE DRIVE ESCORT'), contact('naurae', 'fighter', [300, 80, -2050], 'NAURAE DRIVE ESCORT')]);
    } else if (phase === 'command') {
      this.say('TETRAGON 01 · COMMAND', 'Core exposed. This one is yours, Lion. End the command link and bring us home.');
      this.spawn(this.id === 5 ? [contact('naurae', 'core', [0, 150, -2390], 'NAURALIS COMMAND CORE', 500), contact('naurae', 'fighter', [-260, 250, -2050], 'NAURAE RESERVE DRONE', 100, false), contact('naurae', 'fighter', [260, -10, -2050], 'NAURAE RESERVE DRONE', 100, false)]
        : [contact(this.id === 9 ? 'naurae' : 'trusan', 'core', [0, 30, -1850], this.id === 9 ? 'SCOURGE COMMAND TRANSMITTER' : 'CROWN COMMAND CORE', 550)]);
    } else if (phase === 'march' || phase === 'evacuation') {
      this.convoyWave();
    } else if (phase === 'laser') {
      this.say('TETRAGON 02 · TACTICAL', 'Cryogenic wake at bearing right! Find the cloaked laser ship before the tanks finish charging.');
    } else if (phase === 'ring') {
      this.say('TETRAGON 03 · STRIKE', 'Uranus ring base ahead. SAMs and AA batteries guard the transports. The cube is still shielded.');
      this.spawn([contact('naurae', 'turret', [-350, 30, -1200], 'RING ANTISHIP SAM', 200), contact('naurae', 'turret', [350, 30, -1200], 'RING AA TURRET', 200), contact('naurae', 'transport', [-180, -80, -1550], 'UNARMED VEXTRA TRANSPORT', 130), contact('naurae', 'transport', [190, -80, -1600], 'UNARMED VEXTRA TRANSPORT', 130), contact('naurae', 'fighter', [0, 160, -1350], 'NAURAE RING GUARD')]);
    } else if (phase === 'factory') {
      this.spawn([contact('naurae', 'core', [0, 30, -1400], 'NAURAE PRODUCTION CUBE', 650)]);
      this.factoryWave();
    } else if (phase === 'hypr') {
      this.say('TETRAGON 01 · COMMAND', 'HYPR fitted. Follow the vector to the asteroid belt. Do not let IronFist reach the Scourge.');
    } else if (phase === 'intercept' && this.id === 8) {
      this.say('TETRAGON 02 · TACTICAL', 'Jump complete! IronFist’s squad is ahead. Weapons free.');
      this.spawn([contact('trusan', 'boss', [0, 70, -1850], 'IRONFIST / TRUSAN COMMAND', 650), contact('trusan', 'heavy', [-250, 80, -1600], 'IRONFIST ESCORT', 170), contact('trusan', 'fighter', [260, -50, -1550], 'IRONFIST ESCORT')]);
    } else if (phase === 'scourge') {
      this.say('TETRAGON 01 · COMMAND', 'IronFist is down. Destroy the authorization module before the weapon fires!');
      this.spawn([contact('trusan', 'core', [0, 30, -2100], 'FIRST SCOURGE AUTHORIZATION MODULE', 400)]);
    } else if (phase === 'signal') {
      this.spawn([contact('naurae', 'fighter', [-240, 60, -1500], 'SIGNAL GUARD'), contact('naurae', 'heavy', [240, 50, -1650], 'SIGNAL GUARD', 170)]);
    } else if (phase === 'crown') {
      this.spawn([contact('trusan', 'relay', [-180, 80, -1850], 'CROWN PORT SHIELD RELAY', 230), contact('trusan', 'relay', [180, 80, -1850], 'CROWN STARBOARD SHIELD RELAY', 230), contact('trusan', 'heavy', [0, 190, -1600], 'CROWN GUARD', 180)]);
    }
  }
}
