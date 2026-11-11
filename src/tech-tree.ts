import { partById, shipById, type PartId, type ShipId } from './catalog';

// A branching fleet rather than a linear price list. Dependencies are checked
// only when acquiring a new node, so older imported inventories stay valid.
export const SHIP_PREREQUISITES: Record<ShipId, readonly ShipId[]> = {
  kestrel: [], viper: ['kestrel'], bastion: ['kestrel'],
  specter: ['viper'], peregrine: ['bastion'], paladin: ['specter', 'peregrine'],
};
export const PART_PREREQUISITES: Record<PartId, readonly (ShipId | PartId)[]> = {
  pulse: [], missiles: [], standard: [], balanced: [], targeting: [],
  laser: [], vector: ['viper'], torpedoes: ['bastion'], reinforced: ['bastion'], cooling: ['laser'],
};

export interface TreeInventory { ownedShips: readonly ShipId[]; parts: Partial<Record<PartId, number>> }

export function missingShipRequirements(id: ShipId, inventory: TreeInventory): string[] {
  return SHIP_PREREQUISITES[id].filter((required) => !inventory.ownedShips.includes(required)).map((required) => shipById(required)!.name);
}

export function missingPartRequirements(id: PartId, inventory: TreeInventory): string[] {
  return PART_PREREQUISITES[id].filter((required) =>
    shipById(required) ? !inventory.ownedShips.includes(required as ShipId) : !inventory.parts[required as PartId],
  ).map((required) => shipById(required)?.name || partById(required)!.name);
}

export function partNodeStatus(id: PartId, tier: 1 | 2 | 3, inventory: TreeInventory): 'owned' | 'available' | 'locked' {
  const current = inventory.parts[id] || 0;
  if (current >= tier) return 'owned';
  if (current + 1 !== tier || (tier === 1 && missingPartRequirements(id, inventory).length)) return 'locked';
  return 'available';
}
