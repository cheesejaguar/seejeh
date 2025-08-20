// FILE: src/lib/serialize.ts

import { GameState, GameSettings } from './types';

const GAME_STORAGE_KEY = 'seejeh-game-state';
const SETTINGS_STORAGE_KEY = 'seejeh-settings';

/**
 * Save game state to localStorage
 */
export function saveGameState(state: GameState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(GAME_STORAGE_KEY, serialized);
  } catch (error) {
    console.warn('Failed to save game state:', error);
  }
}

/**
 * Load game state from localStorage
 */
export function loadGameState(): GameState | null {
  try {
    const serialized = localStorage.getItem(GAME_STORAGE_KEY);
    if (serialized) {
      return JSON.parse(serialized);
    }
  } catch (error) {
    console.warn('Failed to load game state:', error);
  }
  return null;
}

/**
 * Clear saved game state
 */
export function clearGameState(): void {
  try {
    localStorage.removeItem(GAME_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear game state:', error);
  }
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: GameSettings): void {
  try {
    const serialized = JSON.stringify(settings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, serialized);
  } catch (error) {
    console.warn('Failed to save settings:', error);
  }
}

/**
 * Load settings from localStorage
 */
export function loadSettings(): GameSettings | null {
  try {
    const serialized = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (serialized) {
      return JSON.parse(serialized);
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }
  return null;
}