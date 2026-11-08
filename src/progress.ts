export const PROGRESS_KEY = 'space.progress.v1';
const BACKUP_KEY = `${PROGRESS_KEY}.backup`;
export interface Progress {
  version: 1;
  credits: number;
  mission2Unlocked: boolean;
  completedRuns: string[];
  lastResult?: { id: string; credits: number; seconds: number };
}
export const freshProgress = (): Progress => ({ version: 1, credits: 0, mission2Unlocked: false, completedRuns: [] });
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function parseProgress(value: string): Progress {
  const data = JSON.parse(value) as Progress;
  if (data?.version !== 1 || !Number.isSafeInteger(data.credits) || data.credits < 0 ||
      typeof data.mission2Unlocked !== 'boolean' || !Array.isArray(data.completedRuns) ||
      data.completedRuns.some((id) => typeof id !== 'string') ||
      (data.lastResult && (typeof data.lastResult.id !== 'string' || !Number.isSafeInteger(data.lastResult.credits) || data.lastResult.credits < 0 || !Number.isFinite(data.lastResult.seconds) || data.lastResult.seconds < 0))) throw new Error('Invalid progression save');
  return data;
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

  complete(id: string, credits: number, seconds: number) {
    if (this.data.completedRuns.includes(id)) return false;
    if (!id || !Number.isSafeInteger(credits) || credits < 0 || !Number.isFinite(seconds) || seconds < 0 || !Number.isSafeInteger(this.data.credits + credits)) throw new Error('Invalid mission reward');
    this.data = { ...this.data, credits: this.data.credits + credits, mission2Unlocked: true, completedRuns: [...this.data.completedRuns, id], lastResult: { id, credits, seconds } };
    if (this.writable) {
      try {
        const previous = this.storage.getItem(PROGRESS_KEY);
        if (previous) {
          // Never copy corrupt primary data over a valid backup.
          try { parseProgress(previous); this.storage.setItem(BACKUP_KEY, previous); } catch { /* Retain backup. */ }
        }
        this.storage.setItem(PROGRESS_KEY, JSON.stringify(this.data));
      } catch { this.writable = false; this.warning = 'Could not save credits. This session is playable, but export your progress before closing.'; }
    }
    return true;
  }

  export() { return JSON.stringify(this.data, null, 2); }
}
