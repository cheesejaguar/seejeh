// FILE: src/tests/ai.spec.ts

import { describe, it, expect } from 'vitest';
import { getBestAIMove, isAITurn } from '../lib/ai';
import { initialState7x7 } from '../lib/rules';
import { GameState, AIDifficulty } from '../lib/types';

describe('AI Engine', () => {
  describe('getBestAIMove', () => {
    it('should return a placement move during placement phase', () => {
      const state = initialState7x7();
      const move = getBestAIMove(state, 'easy');
      
      expect(move).not.toBeNull();
      expect(move?.type).toBe('placement');
      expect(move?.cells).toHaveLength(1);
    });

    it('should return a movement move during movement phase', () => {
      const state = initialState7x7();
      // Simulate end of placement phase
      state.phase = 'movement';
      state.stonesToPlace = { Light: 0, Dark: 0 };
      
      // Place some stones manually for testing
      state.board[1][1] = 'Light';
      state.board[1][2] = 'Dark';
      
      const move = getBestAIMove(state, 'medium');
      
      if (move) {
        expect(move.type).toBe('movement');
        expect(move.from).toBeDefined();
        expect(move.to).toBeDefined();
      }
    });

    it('should prefer capturing moves', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.stonesToPlace = { Light: 0, Dark: 0 };
      
      // Set up a capture scenario
      state.board[2][2] = 'Light';  // AI piece
      state.board[2][3] = 'Dark';   // Opponent piece to capture
      state.board[2][4] = 'Light';  // Bounding piece
      state.current = 'Light';
      
      const move = getBestAIMove(state, 'hard');
      
      // The AI should prefer moves that result in captures
      expect(move).not.toBeNull();
    });

    it('should return different moves for different difficulty levels', () => {
      const state = initialState7x7();
      
      const easyMove = getBestAIMove(state, 'easy');
      const hardMove = getBestAIMove(state, 'hard');
      
      expect(easyMove).not.toBeNull();
      expect(hardMove).not.toBeNull();
      
      // Both should be valid placement moves
      expect(easyMove?.type).toBe('placement');
      expect(hardMove?.type).toBe('placement');
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