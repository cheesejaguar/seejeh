// FILE: src/tests/capturePreview.spec.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings } from '../lib/serialize';
import { useGameStore } from '../state/gameStore';
import { GameSettings } from '../lib/types';

describe('Capture Preview Setting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should have default value true for new settings', () => {
    // Fresh install: nothing saved, the store falls back to its defaults
    expect(loadSettings()).toBeNull();
    expect(useGameStore.getState().settings.capturePreviewsEnabled).toBe(true);
  });

  it('should default to true when migrating settings saved before the option existed', () => {
    const legacy = { ...useGameStore.getState().settings } as Partial<GameSettings>;
    delete legacy.capturePreviewsEnabled;
    localStorage.setItem('seejeh-settings', JSON.stringify(legacy));

    expect(loadSettings()?.capturePreviewsEnabled).toBe(true);
  });

  it('should support disabling capture previews', () => {
    useGameStore.getState().setCapturePreviewsEnabled(false);

    expect(useGameStore.getState().settings.capturePreviewsEnabled).toBe(false);
    // The choice is persisted
    expect(loadSettings()?.capturePreviewsEnabled).toBe(false);

    useGameStore.getState().setCapturePreviewsEnabled(true);
    expect(loadSettings()?.capturePreviewsEnabled).toBe(true);
  });

  it('should keep an explicitly saved false value', () => {
    saveSettings({ ...useGameStore.getState().settings, capturePreviewsEnabled: false });

    expect(loadSettings()?.capturePreviewsEnabled).toBe(false);
  });
});
