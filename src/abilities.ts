import type { ShipId, PartId } from './catalog';

export const ABILITIES = [
  { id: 'focus', name: 'Vextra Focus', price: 0, requires: null, description: '5s aim assist, faster target acquisition, and cooling.' },
  { id: 'phoenix', name: 'Phoenix', price: 2200, requires: 'viper', description: 'Launch up to six missiles at six different hostiles within 1,000 m. Uses carried ammunition.' },
  { id: 'bloodthirst', name: 'Bloodthirst', price: 2200, requires: 'bastion', description: 'For 5s, player kills restore 15% max hull; overflow restores shields.' },
  { id: 'poison', name: 'Poison', price: 1800, requires: 'laser', description: 'For 5s, each primary hit applies a 5s damage-over-time effect. Up to six stacks per target.' },
] as const;
export type AbilityId = typeof ABILITIES[number]['id'];
export const abilityById = (id: string) => ABILITIES.find((ability) => ability.id === id);
export interface AbilityInventory { ownedShips: readonly ShipId[]; parts: Partial<Record<PartId, number>> }
export function missingAbilityRequirement(id: AbilityId, inventory: AbilityInventory): string | null {
  const requirement = abilityById(id)!.requires;
  return requirement && (requirement === 'laser' ? !inventory.parts.laser : !inventory.ownedShips.includes(requirement)) ? requirement : null;
}

export function phoenixTargets<T>(targets: readonly { target: T; distance: number }[], ammo: number): T[] {
  return targets.filter((candidate) => candidate.distance <= 1000 && candidate.distance >= 0)
    .sort((a, b) => a.distance - b.distance).slice(0, Math.min(6, Math.max(0, ammo))).map((candidate) => candidate.target);
}

// Contacts have a combined integrity pool. The outer 30% represents their
// shield layer; both normal hits and Poison strip that layer before hull.
export function contactLayers(integrity: number, maximum: number) {
  const hullMaximum = maximum * 0.7;
  return { shields: Math.max(0, integrity - hullMaximum), hull: Math.max(0, Math.min(hullMaximum, integrity)), hullMaximum, shieldMaximum: maximum - hullMaximum };
}
