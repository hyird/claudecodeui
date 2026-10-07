import type { TerminalPreferences } from './types';

export const DEFAULT_PREFERENCES: TerminalPreferences = {
  fontSize: 14,
};

export const MIN_FONT_SIZE = 11;
export const MAX_FONT_SIZE = 22;

export function clampFontSize(value: unknown) {
  const size = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(size)) {
    return DEFAULT_PREFERENCES.fontSize;
  }

  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)));
}

export function readPreferences(): TerminalPreferences {
  try {
    const stored = localStorage.getItem('terminal-preferences');
    if (!stored) {
      return DEFAULT_PREFERENCES;
    }
    const parsed = JSON.parse(stored) as Partial<TerminalPreferences>;
    return {
      fontSize: clampFontSize(parsed.fontSize),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
