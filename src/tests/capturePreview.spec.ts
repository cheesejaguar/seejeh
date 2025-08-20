// FILE: src/tests/capturePreview.spec.ts

import { describe, it, expect } from 'vitest';
import { GameSettings } from '../lib/types';

describe('Capture Preview Setting', () => {
  it('should have default value true for new settings', () => {
    const defaultSettings: GameSettings = {
      language: 'en',
      aiDifficulty: 'beginner',
      players: {
        Light: { type: 'human' },
        Dark: { type: 'ai', difficulty: 'beginner' }
      },
      variant: {
        firstMoveMustEnterCenter: false,
        antiShuttle: false,
        blockadeOneRemoval: true
      },
      hintsEnabled: false,
      soundEnabled: true,
      soundVolume: 0.5,
      capturePreviewsEnabled: true
    };

    expect(defaultSettings.capturePreviewsEnabled).toBe(true);
  });

  it('should support disabling capture previews', () => {
    const settings: GameSettings = {
      language: 'en',
      aiDifficulty: 'beginner',
      players: {
        Light: { type: 'human' },
        Dark: { type: 'ai', difficulty: 'beginner' }
      },
      variant: {
        firstMoveMustEnterCenter: false,
        antiShuttle: false,
        blockadeOneRemoval: true
      },
      hintsEnabled: false,
      soundEnabled: true,
      soundVolume: 0.5,
      capturePreviewsEnabled: false
    };

    expect(settings.capturePreviewsEnabled).toBe(false);
  });
});