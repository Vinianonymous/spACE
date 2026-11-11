import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, bindKey, parsePreferences } from '../../src/preferences';

describe('pilot preferences', () => {
  it('uses independent defaults for new and malformed storage', () => {
    const first = parsePreferences(null);
    first.bindings.pitchUp = 'Digit1';
    expect(parsePreferences(null).bindings).toEqual(DEFAULT_BINDINGS);
    expect(parsePreferences('{')).toEqual(parsePreferences(null));
  });

  it('keeps saved settings and bindings after reload', () => {
    const prefs = parsePreferences(null);
    prefs.bindings = bindKey(prefs.bindings, 'pitchUp', 'Digit1')!;
    prefs.volume = 0;
    prefs.subtitles = false;
    prefs.hudScale = 1.1;
    prefs.reducedEffects = true;
    expect(parsePreferences(JSON.stringify(prefs))).toEqual(prefs);
  });

  it('rejects duplicates, reserved keys and corrupted maps without disabling controls', () => {
    const prefs = parsePreferences(null);
    expect(bindKey(prefs.bindings, 'pitchUp', 'KeyS')).toBeNull();
    expect(bindKey(prefs.bindings, 'pitchUp', 'Escape')).toBeNull();
    expect(bindKey(prefs.bindings, 'pitchUp', 'KeyH')).toBeNull();
    expect(bindKey(prefs.bindings, 'pitchUp', 'ArrowUp')).toBeNull();
    prefs.bindings.pitchUp = 'KeyS';
    expect(parsePreferences(JSON.stringify(prefs)).bindings).toEqual(DEFAULT_BINDINGS);
    prefs.bindings.pitchUp = 'Digit1';
    delete (prefs.bindings as Partial<typeof prefs.bindings>).fire;
    expect(parsePreferences(JSON.stringify(prefs)).bindings).toEqual(DEFAULT_BINDINGS);
  });

  it('bounds presentation settings read from storage', () => {
    const prefs = parsePreferences(JSON.stringify({ volume: 999, hudScale: 10, subtitles: 0, reducedEffects: 'false' }));
    expect(prefs).toMatchObject({ volume: 0.12, hudScale: 1, subtitles: true, reducedEffects: false });
  });
});
