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

  constructor(public difficulty: Difficulty = 'standard') {}

  update(dt: number) {
    this.damageDelay = Math.max(0, this.damageDelay - dt);
    if (this.damageDelay === 0) this.shields = Math.min(100, this.shields + dt * 9);
    this.heat = Math.max(0, this.heat - dt * (this.focusTime > 0 ? 29 : 22));
    if (this.heat < 30) this.overheated = false;
    this.missileCooldown = Math.max(0, this.missileCooldown - dt);
    this.countermeasureCooldown = Math.max(0, this.countermeasureCooldown - dt);
    this.flareTime = Math.max(0, this.flareTime - dt);
    if (this.focusTime > 0) {
      this.focusTime = Math.max(0, this.focusTime - dt);
      if (this.focusTime === 0) this.focusCooldown = 30;
    } else this.focusCooldown = Math.max(0, this.focusCooldown - dt);
  }

  cannon() {
    if (this.overheated) return false;
    this.shots++;
    this.heat = Math.min(100, this.heat + 7.5);
    if (this.heat >= 100) this.overheated = true;
    return true;
  }

  missile() {
    if (this.ammo === 0 || this.missileCooldown > 0) return false;
    this.ammo--;
    this.missileCooldown = 2.5;
    return true;
  }

  countermeasures() {
    if (this.countermeasureCooldown > 0) return false;
    this.countermeasureCooldown = 8;
    this.flareTime = 2.5;
    return true;
  }

  focus() {
    if (this.focusTime > 0 || this.focusCooldown > 0) return false;
    this.focusTime = 5;
    return true;
  }

  damage(amount: number) {
    const damage = amount * (this.difficulty === 'assist' ? 0.5 : 1);
    const absorbed = Math.min(this.shields, damage);
    this.shields -= absorbed;
    this.hull = Math.max(0, this.hull - (damage - absorbed));
    this.damageDelay = 5;
    return { shieldBreak: absorbed > 0 && this.shields === 0, destroyed: this.hull === 0 };
  }
}
