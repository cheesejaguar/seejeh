// FILE: src/tests/gameStore.spec.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '../state/gameStore';
import { initialState7x7, countStones } from '../lib/rules';

describe('Game store AI turn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should let the AI make a normal movement-phase move', async () => {
    const gameState = initialState7x7();
    gameState.phase = 'movement';
    gameState.stonesToPlace = { Light: 0, Dark: 0 };
    gameState.current = 'Dark';
    for (let c = 0; c < 7; c++) {
      gameState.board[0][c] = 'Light';
      gameState.board[6][c] = 'Dark';
    }
    gameState.board[1][0] = 'Light';
    gameState.board[5][0] = 'Dark';

    const store = useGameStore.getState();
    useGameStore.setState({
      gameState,
      toastMessage: null,
      aiThinking: false,
      blockadeRemovalMode: false,
      settings: {
        ...store.settings,
        aiDifficulty: 'medium',
        players: { Light: { type: 'human' }, Dark: { type: 'ai', difficulty: 'medium' } }
      }
    });

    const done = useGameStore.getState().makeAIMove();
    await vi.runAllTimersAsync();
    await done;

    const after = useGameStore.getState();
    expect(after.toastMessage).not.toBe('AI move failed');
    expect(after.aiThinking).toBe(false);
    // Dark moved one stone and handed the turn to Light
    expect(after.gameState.moveHistory).toHaveLength(1);
    expect(after.gameState.current).toBe('Light');
    expect(countStones(after.gameState, 'Dark')).toBe(8);
  });
});
