// FILE: src/store/settings.ts

import type { Difficulty } from '../ai/search';
import { DEFAULT_VARIANT, normalizeVariant, type Player, type VariantFlags } from '../engine';
import type { Language } from '../i18n';

export const SETTINGS_KEY = 'seejeh.settings.v1';

export interface Settings {
  language: Language;
  theme: 'dark' | 'light';
  difficulty: Difficulty;
  /** Which side the human plays. */
  humanSide: Player;
  soundEnabled: boolean;
  volume: number;
  showCapturePreview: boolean;
  reducedMotion: boolean;
  variant: VariantFlags;
}

function detectLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export function defaultSettings(): Settings {
  return {
    language: detectLanguage(),
    theme: 'dark',
    difficulty: 'easy',
    humanSide: 'Light',
    soundEnabled: true,
    volume: 0.5,
    showCapturePreview: true,
    reducedMotion: false,
    variant: DEFAULT_VARIANT,
  };
}

/**
 * Merges stored settings over the defaults field by field, so a payload written
 * by an older build can never leave a field undefined.
 */
export function parseSettings(text: string | null): Settings {
  const base = defaultSettings();
  if (!text) return base;

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return base;
  }
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Record<string, unknown>;

  const clampVolume = Number(data.volume);

  return {
    language: data.language === 'ar' || data.language === 'en' ? data.language : base.language,
    theme: data.theme === 'light' ? 'light' : 'dark',
    difficulty:
      data.difficulty === 'beginner' ||
      data.difficulty === 'easy' ||
      data.difficulty === 'medium' ||
      data.difficulty === 'hard'
        ? data.difficulty
        : base.difficulty,
    humanSide: data.humanSide === 'Dark' ? 'Dark' : 'Light',
    soundEnabled: typeof data.soundEnabled === 'boolean' ? data.soundEnabled : base.soundEnabled,
    volume: Number.isFinite(clampVolume) ? Math.min(1, Math.max(0, clampVolume)) : base.volume,
    showCapturePreview:
      typeof data.showCapturePreview === 'boolean'
        ? data.showCapturePreview
        : base.showCapturePreview,
    reducedMotion:
      typeof data.reducedMotion === 'boolean' ? data.reducedMotion : base.reducedMotion,
    variant: normalizeVariant(data.variant as Partial<VariantFlags> | null),
  };
}

/** True when the player has settings of their own on this device. */
export function hasStoredSettings(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(SETTINGS_KEY) !== null;
  } catch {
    return false;
  }
}

export function loadSettings(): Settings {
  try {
    return parseSettings(
      typeof localStorage === 'undefined' ? null : localStorage.getItem(SETTINGS_KEY),
    );
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: Settings): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch {
    /* storage unavailable — settings simply do not persist */
  }
}
