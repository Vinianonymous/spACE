import { DEFAULT_STATS, type BuildStats } from './catalog';
import type { AbilityId } from './abilities';
export type Difficulty = 'standard' | 'assist';

export class Systems {
  hull = 100;
  shields = 100;
  heat = 0;
  overheated = false;
  ammo = 24;
  missileCooldown = 0;
  countermeasureCooldown = 0;
  flareTime = 0;
  focusTime = 0;
  focusCooldown = 0;
  damageDelay = 0;
  shots = 0;
  empLockout = 0;
  ammoReloadProgress = 0;

  constructor(public difficulty: Difficulty = 'standard', public stats: BuildStats = DEFAULT_STATS, public ability: AbilityId = 'focus') {
    this.hull = stats.hull;
    this.shields = stats.shields;
    this.ammo = stats.missileAmmo;
  }

  get systemsLocked() { return this.empLockout > 0; }

  update(dt: number, braking = false) {
    const recovery = braking ? 2 : 1;
    this.empLockout = Math.max(0, this.empLockout - dt);
    if (this.empLockout < 1e-6) this.empLockout = 0;
    this.damageDelay = Math.max(0, this.damageDelay - dt * recovery);
    if (this.damageDelay === 0) this.shields = Math.min(this.stats.shields, this.shields + dt * this.stats.shieldRegen * recovery);
    this.heat = Math.max(0, this.heat - dt * recovery * (this.stats.cooling + (this.focusTime > 0 && this.ability === 'focus' ? 7 : 0)));
    if (this.heat < 30) this.overheated = false;
    this.missileCooldown = Math.max(0, this.missileCooldown - dt * recovery);
    this.countermeasureCooldown = Math.max(0, this.countermeasureCooldown - dt * recovery);
    if (braking && this.ammo < this.stats.missileAmmo && !this.systemsLocked) {
      this.ammoReloadProgress += dt;
      if (this.ammoReloadProgress >= 4) {
        this.ammo = Math.min(this.stats.missileAmmo, this.ammo + Math.floor(this.ammoReloadProgress / 4));
        this.ammoReloadProgress %= 4;
      }
    }
    if (this.ammo >= this.stats.missileAmmo) this.ammoReloadProgress = 0;
    this.flareTime = Math.max(0, this.flareTime - dt);
    if (this.focusTime > 0) {
      this.focusTime = Math.max(0, this.focusTime - dt);
      if (this.focusTime === 0) this.focusCooldown = this.stats.focusCooldown;
    } else this.focusCooldown = Math.max(0, this.focusCooldown - dt * recovery);
  }

  cannon() {
    if (this.overheated || this.systemsLocked) return false;
    this.shots++;
    this.heat = Math.min(100, this.heat + this.stats.primaryHeat);
    if (this.heat >= 100) this.overheated = true;
    return true;
  }

  missile() {
    if (this.ammo === 0 || this.missileCooldown > 0 || this.systemsLocked) return false;
    this.ammo--;
    this.missileCooldown = this.stats.missileCooldown;
    return true;
  }

  countermeasures() {
    if (this.countermeasureCooldown > 0 || this.systemsLocked) return false;
    this.countermeasureCooldown = 8;
    this.flareTime = 2.5;
    return true;
  }

  focus() {
    if (this.focusTime > 0 || this.focusCooldown > 0 || this.systemsLocked) return false;
    if (this.ability === 'phoenix') this.focusCooldown = this.stats.focusCooldown;
    else this.focusTime = 5;
    return true;
  }

  salvo(count: number) {
    if (this.systemsLocked || !Number.isInteger(count) || count < 1 || count > this.ammo) return false;
    this.ammo -= count;
    return true;
  }

  bloodthirstKill() {
    if (this.ability !== 'bloodthirst' || this.focusTime <= 0) return;
    const heal = this.stats.hull * 0.15;
    const hull = Math.min(heal, this.stats.hull - this.hull);
    this.hull += hull;
    this.shields = Math.min(this.stats.shields, this.shields + heal - hull);
  }

  /** Naurae EMPs strip shields without damaging the hull and lock every weapon system. */
  emp(drain: number) {
    const amount = Math.min(this.shields, drain * (this.difficulty === 'assist' ? 0.5 : 1));
    this.shields -= amount;
    if (this.focusTime > 0) {
      this.focusTime = 0;
      this.focusCooldown = this.stats.focusCooldown;
    }
    this.empLockout = Math.max(this.empLockout, 3);
    this.damageDelay = this.stats.shieldDelay;
    return { shieldDrain: amount, lockout: this.empLockout };
  }

  damage(amount: number) {
    const damage = amount * (this.difficulty === 'assist' ? 0.5 : 1);
    const absorbed = Math.min(this.shields, damage);
    this.shields -= absorbed;
    this.hull = Math.max(0, this.hull - (damage - absorbed));
    this.damageDelay = this.stats.shieldDelay;
    return { shieldBreak: absorbed > 0 && this.shields === 0, destroyed: this.hull === 0 };
  }
}
