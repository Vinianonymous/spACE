import { DEFAULT_LOADOUT, PARTS, SLOTS, fittingIssues, initialParts, partById, shipById, upgradePrice, type Loadout, type PartId, type PartLevels, type ShipId } from './catalog';
import { isCampaignId, LAST_MISSION, type CampaignId } from './campaign';
import { missingPartRequirements, missingShipRequirements } from './tech-tree';
import { ABILITIES, abilityById, missingAbilityRequirement, type AbilityId } from './abilities';

// Retain the original storage key so existing phase-2 saves are discovered and migrated.
export const PROGRESS_KEY = 'space.progress.v1';
const BACKUP_KEY = `${PROGRESS_KEY}.backup`;
export interface Progress {
  version: 5;
  credits: number;
  mission2Unlocked: boolean;
  unlockedMission: CampaignId;
  completedMissions: CampaignId[];
  campaignComplete: boolean;
  completedRuns: string[];
  ownedShips: ShipId[];
  selectedShip: ShipId;
  parts: PartLevels;
  loadouts: Partial<Record<ShipId, Loadout>>;
  ownedAbilities: AbilityId[];
  selectedAbility: AbilityId;
  lastResult?: { id: string; credits: number; seconds: number; missionId?: CampaignId; optionalComplete?: boolean };
}
export const freshProgress = (): Progress => ({ version: 5, credits: 0, mission2Unlocked: false, unlockedMission: 1, completedMissions: [], campaignComplete: false, completedRuns: [], ownedShips: ['kestrel'], selectedShip: 'kestrel', parts: initialParts(), loadouts: { kestrel: { ...DEFAULT_LOADOUT } }, ownedAbilities: ['focus'], selectedAbility: 'focus' });
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function parseProgress(value: string): Progress {
  let data = JSON.parse(value) as Progress;
  if (![1, 2, 3, 4, 5].includes(data?.version) || !Number.isSafeInteger(data.credits) || data.credits < 0 ||
      typeof data.mission2Unlocked !== 'boolean' || !Array.isArray(data.completedRuns) ||
      data.completedRuns.some((id) => typeof id !== 'string') ||
      (data.lastResult && (typeof data.lastResult.id !== 'string' || !Number.isSafeInteger(data.lastResult.credits) || data.lastResult.credits < 0 || !Number.isFinite(data.lastResult.seconds) || data.lastResult.seconds < 0))) throw new Error('Invalid progression save');
  const oldVersion = Number(data.version);
  if (oldVersion === 4 && (!Array.isArray(data.completedMissions) || data.completedMissions.some((id, index) => id !== index + 1 || id > 5) ||
      data.unlockedMission !== Math.min(5, data.completedMissions.length + 1) || data.campaignComplete !== data.completedMissions.includes(5) ||
      data.mission2Unlocked !== (data.unlockedMission >= 2))) throw new Error('Invalid legacy campaign progression save');
  if (oldVersion === 1) data = { ...freshProgress(), credits: data.credits, completedRuns: data.completedRuns, mission2Unlocked: data.mission2Unlocked, ...(data.lastResult ? { lastResult: data.lastResult } : {}) };
  if (oldVersion < 3) data = { ...data, unlockedMission: data.mission2Unlocked ? 2 : 1, completedMissions: data.mission2Unlocked ? [1] : [], campaignComplete: false, ...(data.lastResult ? { lastResult: { ...data.lastResult, missionId: 1 } } : {}) };
  if (oldVersion < 4) data = { ...data, ownedAbilities: ['focus'], selectedAbility: 'focus' };
  if (oldVersion < 5) data = { ...data, version: 5, unlockedMission: Math.min(LAST_MISSION, data.completedMissions.length + 1) as CampaignId, campaignComplete: data.completedMissions.includes(LAST_MISSION) };
  if (!Array.isArray(data.ownedAbilities) || !data.ownedAbilities.includes('focus') || new Set(data.ownedAbilities).size !== data.ownedAbilities.length ||
      data.ownedAbilities.some((id) => !abilityById(id)) || !data.ownedAbilities.includes(data.selectedAbility)) throw new Error('Invalid ability inventory save');
  if (!Array.isArray(data.ownedShips) || !data.ownedShips.includes('kestrel') || new Set(data.ownedShips).size !== data.ownedShips.length ||
      data.ownedShips.some((id) => !shipById(id)) || !data.ownedShips.includes(data.selectedShip) || !data.parts || typeof data.parts !== 'object' || Array.isArray(data.parts) ||
      Object.entries(data.parts).some(([id, tier]) => !partById(id) || !Number.isInteger(tier) || tier < 1 || tier > 3) ||
      Object.values(DEFAULT_LOADOUT).some((id) => !data.parts[id]) || !data.loadouts || typeof data.loadouts !== 'object' || Array.isArray(data.loadouts) ||
      Object.keys(data.loadouts).some((id) => !data.ownedShips.includes(id as ShipId)) ||
      data.ownedShips.some((id) => !data.loadouts[id] || fittingIssues(id, data.loadouts[id]!, data.parts).length > 0 || Object.keys(data.loadouts[id]!).length !== SLOTS.length)) throw new Error('Invalid inventory or loadout save');
  if (!isCampaignId(data.unlockedMission) || !Array.isArray(data.completedMissions) ||
      data.completedMissions.some((id, index) => !isCampaignId(id) || id !== index + 1) ||
       data.unlockedMission !== Math.min(LAST_MISSION, data.completedMissions.length + 1) ||
       data.campaignComplete !== data.completedMissions.includes(LAST_MISSION) || data.mission2Unlocked !== (data.unlockedMission >= 2) ||
      (data.lastResult && (!isCampaignId(data.lastResult.missionId) || (data.lastResult.optionalComplete !== undefined && typeof data.lastResult.optionalComplete !== 'boolean')))) throw new Error('Invalid campaign progression save');
  // Normalize to known fields rather than retaining arbitrary imported objects.
  return { version: 5, credits: data.credits, mission2Unlocked: data.mission2Unlocked, unlockedMission: data.unlockedMission, completedMissions: [...data.completedMissions], campaignComplete: data.campaignComplete, completedRuns: [...data.completedRuns],
    ownedShips: [...data.ownedShips], selectedShip: data.selectedShip,
    parts: Object.fromEntries(PARTS.filter((part) => data.parts[part.id]).map((part) => [part.id, data.parts[part.id]])),
    loadouts: Object.fromEntries(data.ownedShips.map((id) => [id, Object.fromEntries(SLOTS.map((slot) => [slot, data.loadouts[id]![slot]]))])),
    ownedAbilities: ABILITIES.filter((ability) => data.ownedAbilities.includes(ability.id)).map((ability) => ability.id), selectedAbility: data.selectedAbility,
    ...(data.lastResult ? { lastResult: { ...data.lastResult } } : {}),
  };
}

export class ProgressStore {
  data = freshProgress();
  warning = '';
  private writable = true;

  constructor(private storage: StorageLike) {
    try {
      const raw = storage.getItem(PROGRESS_KEY);
      if (raw) {
        try { this.data = parseProgress(raw); }
        catch {
          const backup = storage.getItem(BACKUP_KEY);
          if (backup) {
            try { this.data = parseProgress(backup); this.warning = 'Primary save invalid. Last valid backup loaded.'; }
            catch { this.writable = false; this.warning = 'Save and backup are invalid. Session progress only; existing data will not be overwritten.'; }
          } else { this.writable = false; this.warning = 'Save invalid. Session progress only; existing data will not be overwritten.'; }
        }
      }
    } catch { this.writable = false; this.warning = 'Storage unavailable. Credits will not persist after closing this page.'; }
  }

  complete(id: string, credits: number, seconds: number, missionId: CampaignId = 1, optionalComplete = false) {
    if (this.data.completedRuns.includes(id)) return false;
    if (!id || !Number.isSafeInteger(credits) || credits < 0 || !Number.isFinite(seconds) || seconds < 0 || !Number.isSafeInteger(this.data.credits + credits)) throw new Error('Invalid mission reward');
    if (!isCampaignId(missionId) || missionId > this.data.unlockedMission) throw new Error('Mission is locked.');
    const completedMissions = [...new Set([...this.data.completedMissions, missionId])].sort((a, b) => a - b);
    this.data = { ...this.data, credits: this.data.credits + credits, mission2Unlocked: true, unlockedMission: Math.min(LAST_MISSION, completedMissions.length + 1) as CampaignId, completedMissions, campaignComplete: completedMissions.includes(LAST_MISSION), completedRuns: [...this.data.completedRuns, id], lastResult: { id, credits, seconds, missionId, optionalComplete } };
    this.persist();
    return true;
  }

  /** Survival payouts do not unlock missions or replace the last campaign debrief. */
  awardSurvivalWave(id: string, credits: number) {
    if (!id || !Number.isSafeInteger(credits) || credits <= 0 || !Number.isSafeInteger(this.data.credits + credits)) throw new Error('Invalid survival reward');
    if (this.data.completedRuns.includes(id)) return false;
    this.data = { ...this.data, credits: this.data.credits + credits, completedRuns: [...this.data.completedRuns, id] };
    this.persist();
    return true;
  }

  private persist() {
    if (this.writable) {
      try {
        const previous = this.storage.getItem(PROGRESS_KEY);
        if (previous) {
          // Never copy corrupt primary data over a valid backup.
          let valid = false;
          try { parseProgress(previous); valid = true; } catch { /* Retain backup. */ }
          if (valid) this.storage.setItem(BACKUP_KEY, previous);
        }
        this.storage.setItem(PROGRESS_KEY, JSON.stringify(this.data));
      } catch { this.writable = false; this.warning = 'Could not save progress. This session is playable, but export your progress before closing.'; }
    }
  }

  private purchase(cost: number, update: (next: Progress) => void) {
    if (!Number.isSafeInteger(cost) || cost < 0 || this.data.credits < cost) throw new Error('Insufficient credits.');
    const next = structuredClone(this.data);
    next.credits -= cost;
    update(next);
    this.data = parseProgress(JSON.stringify(next));
    this.persist();
  }

  buyShip(id: ShipId) {
    const ship = shipById(id);
    if (!ship) throw new Error('Unknown ship.');
    if (this.data.ownedShips.includes(id)) throw new Error('Ship already owned.');
    const missing = missingShipRequirements(id, this.data);
    if (missing.length) throw new Error(`Requires ${missing.join(' + ')} before buying ${ship.name}.`);
    this.purchase(ship.price, (next) => { next.ownedShips.push(id); next.loadouts[id] = { ...DEFAULT_LOADOUT }; });
  }

  buyPart(id: PartId) {
    const part = partById(id);
    if (!part) throw new Error('Unknown part.');
    if (this.data.parts[id]) throw new Error('Part already owned.');
    const missing = missingPartRequirements(id, this.data);
    if (missing.length) throw new Error(`Requires ${missing.join(' + ')} before buying ${part.name}.`);
    this.purchase(part.price, (next) => { next.parts[id] = 1; });
  }

  upgradePart(id: PartId) {
    const tier = this.data.parts[id];
    if (!partById(id) || !tier) throw new Error('Buy this part before upgrading it.');
    if (tier >= 3) throw new Error('Maximum upgrade tier reached.');
    this.purchase(upgradePrice(id, tier), (next) => { next.parts[id] = tier + 1; });
  }

  buyAbility(id: AbilityId) {
    const ability = abilityById(id);
    if (!ability) throw new Error('Unknown ability.');
    if (this.data.ownedAbilities.includes(id)) throw new Error('Ability already owned.');
    const missing = missingAbilityRequirement(id, this.data);
    if (missing) throw new Error(`Requires ${missing} before buying ${ability.name}.`);
    this.purchase(ability.price, (next) => { next.ownedAbilities.push(id); });
  }

  selectAbility(id: AbilityId) {
    if (!this.data.ownedAbilities.includes(id)) throw new Error('Ability not owned.');
    this.purchase(0, (next) => { next.selectedAbility = id; });
  }

  selectShip(id: ShipId) {
    if (!this.data.ownedShips.includes(id)) throw new Error('Ship not owned.');
    this.purchase(0, (next) => { next.selectedShip = id; });
  }

  equip(id: ShipId, loadout: Loadout) {
    if (!this.data.ownedShips.includes(id)) throw new Error('Ship not owned.');
    const issues = fittingIssues(id, loadout, this.data.parts);
    if (issues.length) throw new Error(issues.join(' '));
    this.purchase(0, (next) => { next.loadouts[id] = { ...loadout }; });
  }

  restoreDefault(id: ShipId) { this.equip(id, { ...DEFAULT_LOADOUT }); }

  import(value: string) {
    const validated = parseProgress(value); // Validate fully before touching existing data.
    try {
      const original = this.storage.getItem(PROGRESS_KEY);
      if (original) this.storage.setItem(`${PROGRESS_KEY}.before-import`, original);
      this.writable = true;
      this.warning = '';
    } catch { this.writable = false; this.warning = 'Storage unavailable. Imported progress applies to this session only; export before closing.'; }
    this.data = validated;
    this.persist();
  }

  export() { return JSON.stringify(this.data, null, 2); }
}
