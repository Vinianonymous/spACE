import type { BuildStats } from './catalog';
import type { SpawnSpec } from './campaign';

export const SKILLS = [
  { id: 'arc', name: 'Arc pulse', description: 'Primary hits arc to two other ships within 180 m: 15 damage per rank.', cost: 2 },
  { id: 'blast', name: 'Shockwave warheads', description: 'Secondary hits splash nearby enemies within 180 m for 25% impact damage per rank.', cost: 2 },
  { id: 'siphon', name: 'Shield siphon', description: 'Every kill restores 8% of maximum shields per rank.', cost: 2 },
  { id: 'focus', name: 'Focus reactor', description: '+20% lock speed and −5 seconds Focus recharge per rank.', cost: 2 },
  { id: 'cooling', name: 'Thermal shunt', description: '+25% weapon heat recovery per rank.', cost: 2 },
  { id: 'ion', name: 'Ion wake', description: 'While boosting, deal 12 damage per rank every 0.5 seconds to enemies within 110 m.', cost: 2 },
] as const;
export type SkillId = typeof SKILLS[number]['id'];
export type SurvivalEvent = { type: 'spawn'; actors: SpawnSpec[]; summon?: boolean } | { type: 'boss' } | { type: 'intermission'; earned: number; credits: number };

/** Permanent credits, separate from disposable run tokens; capped for endless waves. */
export const survivalCredits = (wave: number) => Math.min(600, 75 + wave * 25) * (wave % 10 === 0 ? 3 : 1);

/** This entire object is disposable run state. It never reads or writes campaign storage. */
export class Survival {
  wave = 1;
  tokens = 0;
  cleared = 0;
  kills = 0;
  phase: 'combat' | 'boss' | 'intermission' | 'ended' = 'combat';
  skills: Record<SkillId, number> = { arc: 0, blast: 0, siphon: 0, focus: 0, cooling: 0, ion: 0 };
  summons = 0;
  private summonTimer = 8;
  private events: SurvivalEvent[] = [];

  constructor() { this.spawnWave(); }
  drain() { return this.events.splice(0); }
  price(id: SkillId) { return 2 + this.skills[id]; }
  buy(id: SkillId) {
    if (!SKILLS.some((skill) => skill.id === id)) throw new Error('Unknown survival skill.');
    if (this.phase !== 'intermission') throw new Error('Skills can only be purchased between waves.');
    if (this.skills[id] >= 3) throw new Error('Maximum skill rank reached.');
    if (this.tokens < this.price(id)) throw new Error('Insufficient run tokens.');
    this.tokens -= this.price(id);
    this.skills[id]++;
  }
  next() {
    if (this.phase !== 'intermission') throw new Error('Finish the current wave first.');
    this.wave++;
    this.phase = 'combat';
    this.summons = 0;
    this.summonTimer = 8;
    this.spawnWave();
  }
  end() { this.phase = 'ended'; this.events = []; this.tokens = 0; for (const skill of SKILLS) this.skills[skill.id] = 0; }

  update(dt: number, remaining: number, bossAlive: boolean, activeShips: number) {
    if (this.phase === 'intermission' || this.phase === 'ended') return;
    if (this.phase === 'combat' && remaining === 0 && this.wave % 10 === 0) {
      this.phase = 'boss';
      this.events.push({ type: 'boss' }, { type: 'spawn', actors: [{ faction: 'naurae', kind: 'boss', label: `WAVE ${this.wave} / SUMMONER`, health: 1200 + this.wave * 30, required: true, position: [0, 100, -1000] }] });
      return;
    }
    if (remaining === 0 && (this.phase === 'combat' || !bossAlive)) {
      this.cleared = this.wave;
      const earned = this.wave % 10 === 0 ? 6 : 2;
      this.tokens += earned;
      this.phase = 'intermission';
      this.events.push({ type: 'intermission', earned, credits: survivalCredits(this.wave) });
      return;
    }
    if (this.phase === 'boss' && bossAlive) {
      this.summonTimer -= dt;
      if (this.summonTimer <= 0 && activeShips <= 17) {
        this.summonTimer = 8;
        this.summons++;
        this.events.push({ type: 'spawn', summon: true, actors: [-1, 1].map((side) => ({ faction: 'naurae', kind: 'fighter', label: 'SUMMONED NAURAE DRONE', health: Math.round(80 * (1 + this.wave * 0.06)), required: true, position: [side * 220, 60, 160] })) });
      }
    }
  }

  private spawnWave() {
    const count = Math.min(12, 2 + Math.ceil(this.wave / 2));
    const faction = this.wave % 2 ? 'trusan' : 'naurae';
    this.events.push({ type: 'spawn', actors: Array.from({ length: count }, (_, i): SpawnSpec => ({
      faction, kind: i === count - 1 && this.wave >= 4 ? 'heavy' : 'fighter', label: `${faction.toUpperCase()} / WAVE ${this.wave}`,
      health: Math.round((i === count - 1 && this.wave >= 4 ? 150 : 100) * (1 + (this.wave - 1) * 0.06)), required: true,
      position: [Math.sin(i * 2) * 260, Math.cos(i * 1.5) * 80, -500 - i * 75],
    })) });
  }
}

export function survivalStats(base: BuildStats, run: Survival): BuildStats {
  return { ...base, lockSpeed: base.lockSpeed * (1 + 0.2 * run.skills.focus), focusCooldown: 30 - 5 * run.skills.focus, cooling: base.cooling * (1 + 0.25 * run.skills.cooling) };
}
