import { describe, expect, it } from 'vitest';
import { PROGRESS_KEY, ProgressStore, freshProgress, parseProgress } from '../../src/progress';

function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
describe('mission reward persistence', () => {
  it('awards once per run, persists after reload, and permits legitimate replay rewards', () => {
    const local = storage();
    const store = new ProgressStore(local);
    expect(store.complete('run-1', 1500, 80)).toBe(true);
    expect(store.complete('run-1', 1500, 80)).toBe(false);
    const reloaded = new ProgressStore(local);
    expect(reloaded.data.credits).toBe(1500);
    expect(reloaded.complete('run-1', 1500, 80)).toBe(false);
    expect(reloaded.complete('run-2', 2000, 60)).toBe(true);
    expect(reloaded.data.credits).toBe(3500);
    expect(reloaded.data.mission2Unlocked).toBe(true);
  });
  it('rejects malformed saves and restores a valid backup without overwriting it', () => {
    const local = storage();
    local.setItem(PROGRESS_KEY, '{invalid');
    local.setItem(`${PROGRESS_KEY}.backup`, JSON.stringify({ ...freshProgress(), credits: 900 }));
    const store = new ProgressStore(local);
    expect(store.data.credits).toBe(900);
    expect(store.warning).toContain('backup');
    store.complete('new', 1500, 10);
    expect(JSON.parse(local.getItem(`${PROGRESS_KEY}.backup`)! ).credits).toBe(900);
  });
  it('preserves invalid user data and warns instead of silently resetting it', () => {
    const local = storage();
    local.setItem(PROGRESS_KEY, '{invalid');
    const store = new ProgressStore(local);
    store.complete('new', 1500, 10);
    expect(store.warning).toContain('will not be overwritten');
    expect(local.getItem(PROGRESS_KEY)).toBe('{invalid');
  });
  it('handles unavailable and full storage without blocking the mission', () => {
    const unavailable = new ProgressStore({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
    expect(unavailable.complete('run', 1500, 10)).toBe(true);
    expect(unavailable.warning).toContain('unavailable');
    const full = new ProgressStore({ getItem: () => null, setItem() { throw new Error('quota'); } });
    full.complete('run', 1500, 10);
    expect(full.warning).toContain('Could not save');
  });
  it('rejects negative balances, invalid ledger entries, and invalid rewards', () => {
    expect(() => parseProgress(JSON.stringify({ ...freshProgress(), credits: -1 }))).toThrow();
    expect(() => parseProgress(JSON.stringify({ ...freshProgress(), completedRuns: [1] }))).toThrow();
    expect(() => new ProgressStore(storage()).complete('run', -1, 1)).toThrow();
  });
});
