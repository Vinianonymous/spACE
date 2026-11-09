export type ShipId = 'kestrel' | 'viper' | 'bastion' | 'specter' | 'peregrine' | 'paladin';
export const SLOTS = ['primary', 'secondary', 'engine', 'shield', 'utility'] as const;
export type Slot = typeof SLOTS[number];
export type PartId = 'pulse' | 'laser' | 'missiles' | 'torpedoes' | 'standard' | 'vector' | 'balanced' | 'reinforced' | 'targeting' | 'cooling';
export type Loadout = Record<Slot, PartId>;
export type PartLevels = Partial<Record<PartId, number>>;
export interface ShipDefinition {
  id: ShipId; code: string; name: string; role: string; description: string; price: number; capacity: number;
  hull: number; shields: number; speed: number; turn: number; boost: number; reserve: number; acceleration: number; lock: number; damage: number;
}
export const SHIPS: readonly ShipDefinition[] = [
  { id: 'kestrel', code: 'EX-01', name: 'Kestrel', role: 'Multirole', description: 'A dependable first command. Balanced handling, shields, and fitting room.', price: 0, capacity: 12, hull: 100, shields: 100, speed: 150, turn: 0.85, boost: 260, reserve: 100, acceleration: 2, lock: 1, damage: 1 },
  { id: 'viper', code: 'EX-07', name: 'Viper', role: 'Interceptor', description: 'Fast pursuit and sharp turns. Light armor and a restrictive power bus.', price: 3000, capacity: 10, hull: 65, shields: 80, speed: 190, turn: 1.1, boost: 290, reserve: 100, acceleration: 2.6, lock: 1, damage: 0.95 },
  { id: 'bastion', code: 'EX-12', name: 'Bastion', role: 'Heavy assault', description: 'Armored gun platform with powerful cannons. Slow to turn or accelerate.', price: 4500, capacity: 15, hull: 160, shields: 115, speed: 110, turn: 0.62, boost: 210, reserve: 100, acceleration: 1.4, lock: 0.9, damage: 1.15 },
  { id: 'specter', code: 'EX-16', name: 'Specter', role: 'Precision fighter', description: 'Enhanced acquisition and precision fire. Thin shields punish careless approaches.', price: 6000, capacity: 12, hull: 80, shields: 65, speed: 160, turn: 0.95, boost: 265, reserve: 100, acceleration: 2.1, lock: 1.3, damage: 1.05 },
  { id: 'peregrine', code: 'EX-21', name: 'Peregrine', role: 'Skirmisher', description: 'Extended boost and evasive handling at the expense of sustained firepower.', price: 7500, capacity: 11, hull: 85, shields: 90, speed: 170, turn: 1.05, boost: 320, reserve: 140, acceleration: 2.4, lock: 1, damage: 0.85 },
  { id: 'paladin', code: 'EX-30', name: 'Paladin', role: 'Advanced multirole', description: 'The fleet’s most flexible fitting platform. Specialists still outperform it in their roles.', price: 10000, capacity: 16, hull: 110, shields: 110, speed: 155, turn: 0.9, boost: 270, reserve: 110, acceleration: 2, lock: 1.05, damage: 1 },
];
export interface PartDefinition { id: PartId; name: string; slot: Slot; price: number; power: number; description: string; ships?: readonly ShipId[] }
export const PARTS: readonly PartDefinition[] = [
  { id: 'pulse', name: 'Pulse cannon', slot: 'primary', price: 0, power: 2, description: '25 damage / 0.10s, moderate heat. Tiers add 15% damage each.' },
  { id: 'laser', name: 'Rapid laser', slot: 'primary', price: 800, power: 3, description: '14 damage / 0.065s, low heat and faster projectiles. Tiers add 15% damage each.' },
  { id: 'missiles', name: 'Guided missiles', slot: 'secondary', price: 0, power: 2, description: '24 rounds, fast tracking, 100 damage. Tiers add damage and acquisition speed.' },
  { id: 'torpedoes', name: 'Heavy torpedoes', slot: 'secondary', price: 1200, power: 5, description: '8 rounds, 250 damage. Slower acquisition, flight, and tracking; narrower lock cone.', ships: ['kestrel', 'bastion', 'paladin', 'peregrine'] },
  { id: 'standard', name: 'Standard drive', slot: 'engine', price: 0, power: 2, description: 'Balanced speed. Tiers add 6% top/boost speed each.' },
  { id: 'vector', name: 'Vector drive', slot: 'engine', price: 900, power: 3, description: '+22% turn rate, −12% top speed. Tiers add 8% handling each.' },
  { id: 'balanced', name: 'Balanced shield', slot: 'shield', price: 0, power: 2, description: '9 shield/s after 5s. Tiers add 15% shield capacity each.' },
  { id: 'reinforced', name: 'Reinforced shield', slot: 'shield', price: 1000, power: 4, description: '+45% capacity, only 6 shield/s after 6s. Tiers add capacity.' },
  { id: 'targeting', name: 'Targeting processor', slot: 'utility', price: 0, power: 1, description: 'Acquisition package. Tiers improve lock speed by 12% each.' },
  { id: 'cooling', name: 'Cooling system', slot: 'utility', price: 700, power: 3, description: '+35% heat recovery instead of targeting bonuses. Tiers add 15% recovery each.' },
];
export const DEFAULT_LOADOUT: Loadout = { primary: 'pulse', secondary: 'missiles', engine: 'standard', shield: 'balanced', utility: 'targeting' };
export const shipById = (id: string) => SHIPS.find((ship) => ship.id === id);
export const partById = (id: string) => PARTS.find((part) => part.id === id);
export const initialParts = (): PartLevels => Object.fromEntries(Object.values(DEFAULT_LOADOUT).map((id) => [id, 1]));
export const upgradePrice = (id: PartId, currentTier: number) => Math.round((partById(id)!.price * 0.5 + 500) * currentTier);

export function fittingIssues(shipId: ShipId, loadout: Loadout, levels: PartLevels): string[] {
  const ship = shipById(shipId);
  if (!ship) return ['Unknown hull.'];
  const issues: string[] = [];
  let power = 0;
  for (const slot of SLOTS) {
    const part = partById(loadout?.[slot]);
    if (!part || part.slot !== slot) { issues.push(`Invalid ${slot} part.`); continue; }
    power += part.power;
    if (!levels[part.id]) issues.push(`${part.name} is not owned.`);
    if (part.ships && !part.ships.includes(shipId)) issues.push(`${part.name} is incompatible with ${ship.name}.`);
  }
  if (power > ship.capacity) issues.push(`Fitting exceeds capacity: ${power} / ${ship.capacity} power.`);
  return issues;
}
export const fittingPower = (loadout: Loadout) => SLOTS.reduce((total, slot) => total + (partById(loadout[slot])?.power || 0), 0);

export interface BuildStats {
  hull: number; shields: number; shieldRegen: number; shieldDelay: number;
  topSpeed: number; turnRate: number; rollRate: number; boostSpeed: number; boostCapacity: number; acceleration: number;
  primaryDamage: number; primaryInterval: number; primaryHeat: number; primarySpeed: number; aimCone: number; cooling: number;
  secondaryDamage: number; secondarySpeed: number; secondaryTurn: number; missileAmmo: number; missileCooldown: number;
  lockSpeed: number; lockCone: number;
  focusCooldown: number;
}
/** The same calculation powers the hangar comparisons and the actual simulation. */
export function buildStats(shipId: ShipId, loadout: Loadout = DEFAULT_LOADOUT, levels: PartLevels = initialParts()): BuildStats {
  const ship = shipById(shipId)!;
  const tier = (slot: Slot) => (levels[loadout[slot]] || 1) - 1;
  const laser = loadout.primary === 'laser', heavy = loadout.secondary === 'torpedoes';
  const vector = loadout.engine === 'vector', reinforced = loadout.shield === 'reinforced';
  const turn = ship.turn * (vector ? 1.22 + tier('engine') * 0.08 : 1);
  return {
    hull: ship.hull, shields: Math.round(ship.shields * (reinforced ? 1.45 : 1) * (1 + tier('shield') * 0.15)),
    shieldRegen: reinforced ? 6 : 9, shieldDelay: reinforced ? 6 : 5,
    topSpeed: ship.speed * (vector ? 0.88 : 1 + tier('engine') * 0.06), turnRate: turn, rollRate: turn / 0.85 * 1.65,
    boostSpeed: ship.boost * (vector ? 0.95 : 1 + tier('engine') * 0.06), boostCapacity: ship.reserve, acceleration: ship.acceleration,
    primaryDamage: (laser ? 14 : 25) * ship.damage * (1 + tier('primary') * 0.15),
    primaryInterval: laser ? 0.065 : 0.1, primaryHeat: laser ? 3.8 : 7.5, primarySpeed: laser ? 1800 : 1150,
    aimCone: (laser ? 5 : 4) + (shipId === 'specter' ? 1 : 0),
    cooling: 22 * (loadout.utility === 'cooling' ? 1.35 + tier('utility') * 0.15 : 1),
    secondaryDamage: (heavy ? 250 : 100) * (1 + tier('secondary') * 0.15), secondarySpeed: heavy ? 340 : 550,
    secondaryTurn: heavy ? 1.6 : 5, missileAmmo: heavy ? 8 : 24, missileCooldown: heavy ? 4 : 2.5,
    lockSpeed: ship.lock * (heavy ? 0.6 : 1) * (1 + tier('secondary') * 0.08) * (loadout.utility === 'targeting' ? 1 + tier('utility') * 0.12 : 1),
    lockCone: heavy ? 10 : 18,
    focusCooldown: 30,
  };
}
export const DEFAULT_STATS = buildStats('kestrel');
export const STAT_LABELS: readonly [keyof BuildStats, string, string][] = [
  ['hull', 'Hull', 'HP'], ['shields', 'Shields', 'HP'], ['shieldRegen', 'Shield recovery', '/s'], ['shieldDelay', 'Recharge delay', 's'],
  ['topSpeed', 'Top speed', 'm/s'], ['turnRate', 'Pitch / yaw', 'rad/s'], ['rollRate', 'Roll', 'rad/s'],
  ['boostSpeed', 'Boost speed', 'm/s'], ['boostCapacity', 'Boost reserve', ''],
  ['primaryDamage', 'Primary damage', ''], ['primaryInterval', 'Shot interval', 's'], ['primaryHeat', 'Heat / shot', '%'], ['cooling', 'Heat recovery', '/s'],
  ['secondaryDamage', 'Secondary damage', ''], ['missileAmmo', 'Secondary rounds', ''], ['lockSpeed', 'Lock multiplier', '×'],
];
