import type { Faction, TargetKind } from './campaign';

/** Naurae electronic warfare: a telegraphed EMP that strips shields and locks systems. */
export const EMP_RANGE = 550;
export const EMP_CHARGE_SECONDS = 1.6;
export const EMP_COOLDOWN_SECONDS = 14;
export const EMP_SHIELD_DRAIN = 45;
/** After a blast, Lion's systems harden briefly so several Naurae cannot chain-lock every weapon. */
export const EMP_SUPPRESSION_SECONDS = 6;

/** Naurae survivability: short-range displacement when damaged. */
export const TELEPORT_HULL_RATIO = 0.75;
export const TELEPORT_COOLDOWN_SECONDS = 12;
export const TELEPORT_MIN_RANGE = 320;
export const TELEPORT_MAX_RANGE = 780;

/** Trusan desperation: a damaged raider overclocks its drive and rams the target. */
export const OVERCLOCK_HULL_RATIO = 0.35;
export const OVERCLOCK_FUSE_SECONDS = 3.2;
export const OVERCLOCK_DAMAGE = 42;
export const OVERCLOCK_RADIUS = 170;
export const OVERCLOCK_SPEED = 380;
export const OVERCLOCK_TRIGGER_RANGE = 1800;

export type FactionEvent = 'emp-charge' | 'emp-blast' | 'teleport' | 'overclock' | 'detonate';

/** The mutable subset shared by simulated combat ships and unit tests. */
export interface FactionActorState {
  faction: Faction;
  kind: TargetKind;
  health: number;
  maxHealth: number;
  empCooldown: number;
  empCharge: number;
  teleportCooldown: number;
  overclock: number;
  overclockCooldown: number;
}

const isCombatShip = (kind: TargetKind) => kind === 'fighter' || kind === 'heavy';

export function canUseEmp(faction: Faction, kind: TargetKind, distanceToPlayer: number) {
  return faction === 'naurae' && isCombatShip(kind) && distanceToPlayer <= EMP_RANGE;
}

export function canTeleport(faction: Faction, kind: TargetKind, hullRatio: number) {
  return faction === 'naurae' && isCombatShip(kind) && hullRatio <= TELEPORT_HULL_RATIO;
}

export function canOverclock(faction: Faction, kind: TargetKind, hullRatio: number, distanceToTarget: number) {
  return faction === 'trusan' && isCombatShip(kind) && hullRatio <= OVERCLOCK_HULL_RATIO && distanceToTarget <= OVERCLOCK_TRIGGER_RANGE;
}

/** Fuse-detonation damage falls off with distance but never drops below 35% inside the radius. */
export function overclockDamage(distance: number) {
  if (distance > OVERCLOCK_RADIUS) return 0;
  const falloff = 1 - Math.max(0, distance) / OVERCLOCK_RADIUS;
  return OVERCLOCK_DAMAGE * (0.35 + 0.65 * falloff);
}

/**
 * Advances one hostile ship's faction-specific ability timers.
 * Exavius ships never enter this path, so player handling stays unchanged.
 * Returns at most one event per tick; the caller applies its simulation effects.
 */
export function tickFaction(
  actor: FactionActorState,
  dt: number,
  distanceToPlayer: number,
  distanceToTarget: number,
): FactionEvent | undefined {
  if (actor.faction === 'trusan') {
    if (actor.overclock > 0) {
      actor.overclock = Math.max(0, actor.overclock - dt);
      return actor.overclock === 0 ? 'detonate' : undefined;
    }
    if (actor.overclockCooldown <= 0 && canOverclock(actor.faction, actor.kind, actor.health / actor.maxHealth, distanceToTarget)) {
      actor.overclock = OVERCLOCK_FUSE_SECONDS;
      actor.overclockCooldown = Infinity;
      return 'overclock';
    }
    return undefined;
  }
  if (actor.faction !== 'naurae') return undefined;

  actor.empCooldown = Math.max(0, actor.empCooldown - dt);
  actor.teleportCooldown = Math.max(0, actor.teleportCooldown - dt);
  if (actor.empCharge > 0) {
    actor.empCharge = Math.max(0, actor.empCharge - dt);
    if (actor.empCharge > 0) return undefined;
    actor.empCooldown = EMP_COOLDOWN_SECONDS;
    return distanceToPlayer <= EMP_RANGE ? 'emp-blast' : undefined;
  }
  if (actor.empCooldown <= 0 && canUseEmp(actor.faction, actor.kind, distanceToPlayer)) {
    actor.empCharge = EMP_CHARGE_SECONDS;
    return 'emp-charge';
  }
  if (actor.teleportCooldown <= 0 && canTeleport(actor.faction, actor.kind, actor.health / actor.maxHealth)) {
    actor.teleportCooldown = TELEPORT_COOLDOWN_SECONDS;
    return 'teleport';
  }
  return undefined;
}
