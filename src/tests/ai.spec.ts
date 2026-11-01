// FILE: src/tests/ai.spec.ts

import { describe, it, expect } from 'vitest';
import { getBestAIMove, isAITurn } from '../lib/ai';
import { initialState7x7, applyMove, isCenter } from '../lib/rules';
import { GameState, AIDifficulty, AIMove } from '../lib/types';

const DIFFICULTIES: AIDifficulty[] = ['beginner', 'easy', 'medium', 'hard'];

function expectLegalPlacement(state: GameState, move: AIMove | null) {
  expect(move).not.toBeNull();
  expect(move!.type).toBe('placement');
  expect(move!.cells).toHaveLength(1);
  const cell = move!.cells[0];
  expect(isCenter(cell)).toBe(false);
  expect(state.board[cell.r][cell.c]).toBe(null);
}

describe('AI Engine', () => {
  describe('getBestAIMove', () => {
    it('should return a placement move during placement phase', () => {
      const state = initialState7x7();
      const move = getBestAIMove(state, 'easy');
      
      expectLegalPlacement(state, move);
    });

    it('should handle second stone placement correctly', () => {
      const state = initialState7x7();
      // First stone of the turn already placed
      state.board[0][0] = 'Light';
      state.stonesToPlace.Light = 23;
      state.placementCount = 1;
      const move = getBestAIMove(state, 'medium');
      
      expectLegalPlacement(state, move);
      expect(move!.cells[0]).not.toEqual({ r: 0, c: 0 });
    });

    it('should return a movement move during movement phase', () => {
      const state = initialState7x7();
      // Simulate end of placement phase
      state.phase = 'movement';
      state.stonesToPlace = { Light: 0, Dark: 0 };
      
      // Place some stones manually for testing
      state.board[1][1] = 'Light';
      state.board[1][2] = 'Dark';
      
      state.current = 'Light';
      
      const move = getBestAIMove(state, 'medium');
      
      expect(move).not.toBeNull();
      expect(move!.type).toBe('movement');
      // Only Light stone is at (1,1); its free neighbours are (0,1), (2,1), (1,0)
      expect(move!.from).toEqual({ r: 1, c: 1 });
      expect([{ r: 0, c: 1 }, { r: 2, c: 1 }, { r: 1, c: 0 }]).toContainEqual(move!.to);
    });

    it('should prefer capturing moves', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.stonesToPlace = { Light: 0, Dark: 0 };
      
      // Light(2,0) - Dark(2,1) - [empty](2,2) - Light(2,3)
      // Moving (2,3) -> (2,2) captures (2,1)
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[2][3] = 'Light';
      state.board[5][5] = 'Light';  // Non-capturing alternative
      state.current = 'Light';
      
      for (const difficulty of ['medium', 'hard'] as const) {
        const move = getBestAIMove(state, difficulty);
        
        expect(move).not.toBeNull();
        expect(move!.from).toEqual({ r: 2, c: 3 });
        expect(move!.to).toEqual({ r: 2, c: 2 });
        expect(applyMove(state, move!.from!, move!.to!).capturedLastMove).toEqual([{ r: 2, c: 1 }]);
      }
    });

    // Bug: after a capture applyMove leaves the AI on turn in 'chain' phase, but
    // getBestAIMove scores it with minimax(..., maximizingPlayer = false), so the
    // AI's own chain continuation is treated as the opponent's minimising reply.
    // With a full board at depth 4 that makes 'hard' rate a free capture below a
    // quiet move into the center.
    it.fails('should take a free capture on a crowded board at hard difficulty', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.stonesToPlace = { Light: 0, Dark: 0 };
      state.current = 'Light';
      for (let c = 0; c < 7; c++) {
        state.board[0][c] = 'Light';
        state.board[6][c] = 'Dark';
      }
      state.board[5][0] = 'Dark';
      state.board[5][1] = 'Dark';
      state.board[5][2] = 'Dark';
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[2][3] = 'Light';
      state.board[5][5] = 'Light';

      const move = getBestAIMove(state, 'hard');
      expect(move!.to).toEqual({ r: 2, c: 2 });
    });

    it('should return a legal placement at every difficulty level', () => {
      const state = initialState7x7();
      
      for (const difficulty of DIFFICULTIES) {
        expectLegalPlacement(state, getBestAIMove(state, difficulty));
      }
    });
  });

  describe('isAITurn', () => {
    it('should return true when current player is AI', () => {
      const state = initialState7x7();
      state.current = 'Dark';
      
      const players = {
        Light: { type: 'human' as const },
        Dark: { type: 'ai' as const }
      };
      
      expect(isAITurn(state, players)).toBe(true);
    });

    it('should return false when current player is human', () => {
      const state = initialState7x7();
      state.current = 'Light';
      
      const players = {
        Light: { type: 'human' as const },
        Dark: { type: 'ai' as const }
      };
      
      expect(isAITurn(state, players)).toBe(false);
    });

    it('should return false when both players are human', () => {
      const state = initialState7x7();
      
      const players = {
        Light: { type: 'human' as const },
        Dark: { type: 'human' as const }
      };
      
      expect(isAITurn(state, players)).toBe(false);
    });
  });
});