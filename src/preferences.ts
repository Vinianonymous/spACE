export const PREFS_KEY = 'space.preferences.v1';

export const DEFAULT_BINDINGS = {
  pitchUp: 'KeyW', pitchDown: 'KeyS', yawLeft: 'KeyA', yawRight: 'KeyD',
  rollLeft: 'KeyQ', rollRight: 'KeyE', throttleUp: 'KeyR', throttleDown: 'KeyF',
  boost: 'ShiftLeft', fire: 'Space', missile: 'KeyM', target: 'Tab',
  objective: 'KeyG', padlock: 'KeyC', countermeasures: 'KeyX', focus: 'KeyV', recenter: 'KeyZ',
} as const;
export type Binding = keyof typeof DEFAULT_BINDINGS;
export type Bindings = Record<Binding, string>;
export const BINDING_LABELS: Record<Binding, string> = {
  pitchUp: 'Pitch up', pitchDown: 'Pitch down', yawLeft: 'Yaw left', yawRight: 'Yaw right',
  rollLeft: 'Roll left', rollRight: 'Roll right', throttleUp: 'Throttle up', throttleDown: 'Throttle down',
  boost: 'Boost', fire: 'Primary weapon', missile: 'Missile', target: 'Cycle target',
  objective: 'Track objective', padlock: 'Padlock camera', countermeasures: 'Countermeasures', focus: 'Vextra Focus', recenter: 'Recenter yoke',
};

export interface Preferences {
  bindings: Bindings;
  volume: number;
  subtitles: boolean;
  hudScale: number;
  reducedEffects: boolean;
}
export const DEFAULT_PREFERENCES: Preferences = {
  bindings: { ...DEFAULT_BINDINGS }, volume: 0.12, subtitles: true, hudScale: 1, reducedEffects: false,
};

// Physical key codes are layout-independent. Keep browser/system keys and the
// fixed help/pause shortcuts free so a pilot can always leave or fix a binding.
export const validBindingCode = (code: string) => /^(Key[A-Z]|Digit[0-9]|Space|Tab|ShiftLeft|ShiftRight)$/.test(code) && code !== 'KeyH';

export function bindKey(bindings: Bindings, action: Binding, code: string): Bindings | null {
  if (!validBindingCode(code) || Object.entries(bindings).some(([name, key]) => name !== action && key === code)) return null;
  return { ...bindings, [action]: code };
}

export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return { ...DEFAULT_PREFERENCES, bindings: { ...DEFAULT_BINDINGS } };
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object') throw new Error('Invalid preferences');
    const bindings: Bindings = { ...DEFAULT_BINDINGS };
    // Reject the entire key map if any entry is malformed or duplicated: a
    // partially loaded map could silently disable an essential action.
    if (value.bindings && typeof value.bindings === 'object') {
      for (const action of Object.keys(DEFAULT_BINDINGS) as Binding[]) {
        if (typeof value.bindings[action] !== 'string' || !validBindingCode(value.bindings[action])) throw new Error('Invalid binding');
        bindings[action] = value.bindings[action];
      }
      if (new Set(Object.values(bindings)).size !== Object.keys(bindings).length) throw new Error('Duplicate binding');
    }
    return {
      bindings,
      volume: typeof value.volume === 'number' && Number.isFinite(value.volume) && value.volume >= 0 && value.volume <= 0.3 ? value.volume : 0.12,
      subtitles: typeof value.subtitles === 'boolean' ? value.subtitles : true,
      hudScale: [0.9, 1, 1.1].includes(value.hudScale) ? value.hudScale : 1,
      reducedEffects: typeof value.reducedEffects === 'boolean' ? value.reducedEffects : false,
    };
  } catch { return { ...DEFAULT_PREFERENCES, bindings: { ...DEFAULT_BINDINGS } }; }
}

export function keyLabel(code: string): string {
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Shift(Left|Right)$/, 'SHIFT').toUpperCase();
}
