// FILE: src/tests/aiChainCapture.spec.ts

import { describe, it, expect } from 'vitest';
import { getBestAIMove, getTopMoves } from '../lib/ai';
import { initialState7x7, applyMove, resolveCaptures } from '../lib/rules';
import { GameState, AIDifficulty } from '../lib/types';

describe('AI Chain Capture Handling', () => {
  describe('Chain Phase Move Generation', () => {
    it('should generate moves from chainOrigin in chain phase', () => {
      const state = initialState7x7();
      state.phase = 'chain';
      state.current = 'Light';
      state.chainOrigin = { r: 2, c: 2 };
      state.board[2][2] = 'Light';

      const move = getBestAIMove(state, 'medium');

      expect(move).not.toBeNull();
      expect(move!.type).toBe('movement');
      expect(move!.from).toEqual({ r: 2, c: 2 });
    });

    it('should not generate moves from other pieces in chain phase', () => {
      const state = initialState7x7();
      state.phase = 'chain';
      state.current = 'Light';
      state.chainOrigin = { r: 2, c: 2 };
      state.board[2][2] = 'Light';
      state.board[5][5] = 'Light'; // Another Light piece

      const move = getBestAIMove(state, 'hard');

      // Move should only come from chainOrigin
      expect(move).not.toBeNull();
      expect(move!.from).toEqual({ r: 2, c: 2 });
    });
  });

  describe('AI Capture Preference', () => {
    it('should prefer moves that result in captures', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Setup capture opportunity
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[2][3] = 'Light'; // Can move to (2,2) to capture

      // Also give a non-capturing option
      state.board[5][5] = 'Light';

      const move = getBestAIMove(state, 'hard');

      // AI should choose the capturing move
      expect(move).not.toBeNull();
      expect(move!.from).toEqual({ r: 2, c: 3 });
      expect(move!.to).toEqual({ r: 2, c: 2 });
    });

    it('should evaluate capture value at higher difficulties', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Setup multiple captures
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[2][2] = 'Dark';
      state.board[2][4] = 'Light'; // Can capture 2 Darks

      state.board[4][0] = 'Light';
      state.board[4][1] = 'Dark';
      state.board[4][3] = 'Light'; // Can capture 1 Dark

      const topMoves = getTopMoves(state, 5);

      expect(topMoves).toHaveLength(5);
      // The double capture ranks first, the single capture second
      expect(topMoves[0].move.from).toEqual({ r: 2, c: 4 });
      expect(topMoves[0].move.to).toEqual({ r: 2, c: 3 });
      expect(topMoves[0].description).toBe('Captures 2 stones');
      expect(topMoves[1].move.from).toEqual({ r: 4, c: 3 });
      expect(topMoves[1].move.to).toEqual({ r: 4, c: 2 });
      expect(topMoves[1].description).toBe('Captures 1 stone');
      expect(topMoves[0].score).toBeGreaterThan(topMoves[1].score);
    });
  });

  describe('AI Difficulty Levels', () => {
    const difficulties: AIDifficulty[] = ['beginner', 'easy', 'medium', 'hard'];

    for (const difficulty of difficulties) {
      it(`should make valid moves at ${difficulty} level`, () => {
        const state = initialState7x7();
        state.phase = 'movement';
        state.current = 'Light';
        state.board[3][3] = 'Light';

        const move = getBestAIMove(state, difficulty);

        expect(move).not.toBeNull();
        expect(move!.type).toBe('movement');
        expect(move!.from).toEqual({ r: 3, c: 3 });
        expect([
          { r: 2, c: 3 }, { r: 4, c: 3 }, { r: 3, c: 2 }, { r: 3, c: 4 }
        ]).toContainEqual(move!.to);
        // The move must be accepted by the rules engine
        expect(applyMove(state, move!.from!, move!.to!).board[move!.to!.r][move!.to!.c]).toBe('Light');
      });
    }
  });

  describe('AI Move Analysis', () => {
    it('should provide top moves with descriptions', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';
      state.board[2][2] = 'Light';
      state.board[4][4] = 'Light';

      const topMoves = getTopMoves(state, 3);

      // Two free stones in open space have 8 legal moves; ask for the top 3
      expect(topMoves).toHaveLength(3);
      for (const { move, description } of topMoves) {
        expect(['Secure center position', 'Improves mobility', 'Strengthens position']).toContain(description);
        expect(move.type).toBe('movement');
        expect([{ r: 2, c: 2 }, { r: 4, c: 4 }]).toContainEqual(move.from);
      }
      // Sorted best-first
      for (let i = 1; i < topMoves.length; i++) {
        expect(topMoves[i - 1].score).toBeGreaterThanOrEqual(topMoves[i].score);
      }
    });
  });

  describe('AI Placement Phase', () => {
    it('should make valid placements during placement phase', () => {
      const state = initialState7x7();

      const move = getBestAIMove(state, 'medium');

      expect(move).not.toBeNull();
      expect(move!.type).toBe('placement');
      expect(move!.cells).toHaveLength(1);

      // Should not place in center
      expect(move!.cells[0]).not.toEqual({ r: 3, c: 3 });
    });

    it('should handle second stone placement', () => {
      const state = initialState7x7();
      state.placementCount = 1;
      state.board[0][0] = 'Light';
      state.stonesToPlace.Light = 23;

      const move = getBestAIMove(state, 'medium');

      expect(move).not.toBeNull();
      expect(move!.type).toBe('placement');
      expect(move!.cells).toHaveLength(1);
      const cell = move!.cells[0];
      expect(cell).not.toEqual({ r: 0, c: 0 }); // already occupied
      expect(cell).not.toEqual({ r: 3, c: 3 });
    });
  });

  describe('AI Edge Cases', () => {
    it('should handle no moves available', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Single blocked piece
      state.board[1][1] = 'Light';
      state.board[0][1] = 'Dark';
      state.board[2][1] = 'Dark';
      state.board[1][0] = 'Dark';
      state.board[1][2] = 'Dark';

      const move = getBestAIMove(state, 'medium');

      // Should return null when no moves available
      expect(move).toBeNull();
    });

    it('should handle chain with no further captures', () => {
      const state = initialState7x7();
      state.phase = 'chain';
      state.current = 'Light';
      state.chainOrigin = { r: 3, c: 3 };
      state.board[3][3] = 'Light';

      // No capture opportunities from center
      const move = getBestAIMove(state, 'medium');

      // Should still return a valid move (even without captures)
      expect(move).not.toBeNull();
      expect(move!.from).toEqual({ r: 3, c: 3 });
    });
  });
});
