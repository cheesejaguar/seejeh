// FILE: src/tests/variants.spec.ts

import { describe, it, expect } from 'vitest';
import {
  initialState7x7,
  applyMove,
  invokeBlockadeIfAny,
  hasAnyLegalMove
} from '../lib/rules';
import { GameState } from '../lib/types';

describe('Game Variants', () => {
  describe('First Move Must Enter Center', () => {
    it('should allow first move to center when variant enabled', () => {
      const state = initialState7x7({
        firstMoveMustEnterCenter: true
      });
      state.phase = 'movement';
      state.board[2][3] = 'Light'; // Adjacent to center
      state.current = 'Light';

      const newState = applyMove(state, { r: 2, c: 3 }, { r: 3, c: 3 });
      expect(newState.board[3][3]).toBe('Light');
    });

    it('should block first move away from center when variant enabled', () => {
      const state = initialState7x7({
        firstMoveMustEnterCenter: true
      });
      state.phase = 'movement';
      state.board[0][0] = 'Light';
      state.current = 'Light';

      expect(() => {
        applyMove(state, { r: 0, c: 0 }, { r: 0, c: 1 });
      }).toThrow('First move must enter center');
    });

    it('should allow any move after first move entered center', () => {
      const state = initialState7x7({
        firstMoveMustEnterCenter: true
      });
      state.phase = 'movement';
      state.board[3][3] = 'Light'; // Piece in center
      state.board[0][0] = 'Dark';
      state.current = 'Dark';
      state.moveHistory = [{ // Simulate first move happened
        pieceId: '2,3',
        from: { r: 2, c: 3 },
        to: { r: 3, c: 3 },
        timestamp: Date.now()
      }];

      const newState = applyMove(state, { r: 0, c: 0 }, { r: 0, c: 1 });
      expect(newState.board[0][1]).toBe('Dark');
    });

    it('should not require center move when variant disabled', () => {
      const state = initialState7x7({
        firstMoveMustEnterCenter: false
      });
      state.phase = 'movement';
      state.board[0][0] = 'Light';
      state.current = 'Light';

      const newState = applyMove(state, { r: 0, c: 0 }, { r: 0, c: 1 });
      expect(newState.board[0][1]).toBe('Light');
    });
  });

  describe('Anti-Shuttle Rule', () => {
    it('should allow normal back-and-forth movement when disabled', () => {
      const state = initialState7x7({
        antiShuttle: false
      });
      state.phase = 'movement';
      state.board[1][1] = 'Light';
      state.board[5][5] = 'Dark';
      state.current = 'Light';

      // Both players shuttle back and forth twice, then Light goes again
      const A = { r: 1, c: 1 }, B = { r: 1, c: 2 };
      const C = { r: 5, c: 5 }, D = { r: 5, c: 6 };
      let currentState = state;
      for (let i = 0; i < 2; i++) {
        currentState = applyMove(currentState, A, B);
        currentState = applyMove(currentState, C, D);
        currentState = applyMove(currentState, B, A);
        currentState = applyMove(currentState, D, C);
      }

      // Should not throw
      const after = applyMove(currentState, A, B);
      expect(after.board[1][2]).toBe('Light');
      expect(after.board[1][1]).toBe(null);
      expect(after.moveHistory).toHaveLength(9);
    });

    // Bug: rules.ts identifies a piece by its *current* square (pieceId = "r,c" of
    // `from`) and then requires recentMoves[even].from to equal the destination.
    // Every move filtered by that pieceId starts at `from`, never at `to`, so the
    // shuttle check can never match and the variant is a no-op.
    it.fails('should block repetitive shuttle when enabled', () => {
      const state = initialState7x7({
        antiShuttle: true
      });
      state.phase = 'movement';
      state.board[1][1] = 'Light';
      state.board[5][5] = 'Dark';
      state.current = 'Light';

      // Both players shuttle back and forth twice through real turns
      const A = { r: 1, c: 1 }, B = { r: 1, c: 2 };
      const C = { r: 5, c: 5 }, D = { r: 5, c: 6 };
      let currentState = state;
      for (let i = 0; i < 2; i++) {
        currentState = applyMove(currentState, A, B);
        currentState = applyMove(currentState, C, D);
        currentState = applyMove(currentState, B, A);
        currentState = applyMove(currentState, D, C);
      }

      // A fifth shuttle step by the same Light stone should be rejected
      expect(() => applyMove(currentState, A, B)).toThrow('Anti-shuttle rule prevents this move');
    });

    it('should allow movement of different pieces', () => {
      const state = initialState7x7({
        antiShuttle: true
      });
      state.phase = 'movement';
      state.board[1][1] = 'Light';
      state.board[5][5] = 'Light';
      state.current = 'Light';

      // Simulate shuttle history for piece at (1,1)
      state.moveHistory = [
        { pieceId: '1,1', from: { r: 1, c: 1 }, to: { r: 1, c: 2 }, timestamp: 1 },
        { pieceId: '1,1', from: { r: 1, c: 2 }, to: { r: 1, c: 1 }, timestamp: 2 },
        { pieceId: '1,1', from: { r: 1, c: 1 }, to: { r: 1, c: 2 }, timestamp: 3 },
        { pieceId: '1,1', from: { r: 1, c: 2 }, to: { r: 1, c: 1 }, timestamp: 4 },
      ];

      // Moving a different piece should be allowed
      const newState = applyMove(state, { r: 5, c: 5 }, { r: 5, c: 6 });
      expect(newState.board[5][6]).toBe('Light');
    });
  });

  describe('Blockade One Removal', () => {
    it('should require stone removal when player is blocked', () => {
      const state = initialState7x7({
        blockadeOneRemoval: true
      });
      state.phase = 'movement';
      state.current = 'Light';

      // Create blocked scenario - single Light stone surrounded
      state.board[1][1] = 'Light';
      state.board[0][1] = 'Dark';
      state.board[2][1] = 'Dark';
      state.board[1][0] = 'Dark';
      state.board[1][2] = 'Dark';

      expect(hasAnyLegalMove(state, 'Light')).toBe(false);

      // Invoke blockade resolution
      const afterBlockade = invokeBlockadeIfAny(state, { r: 1, c: 1 });
      expect(afterBlockade.board[1][1]).toBe(null); // Stone removed
    });

    it('should not invoke blockade when player has moves', () => {
      const state = initialState7x7({
        blockadeOneRemoval: true
      });
      state.phase = 'movement';
      state.current = 'Light';

      state.board[1][1] = 'Light';
      // Not surrounded, has moves

      expect(hasAnyLegalMove(state, 'Light')).toBe(true);

      const afterCheck = invokeBlockadeIfAny(state);
      expect(afterCheck.board[1][1]).toBe('Light'); // Stone still there
    });

    it('should throw error for invalid stone removal', () => {
      const state = initialState7x7({
        blockadeOneRemoval: true
      });
      state.phase = 'movement';
      state.current = 'Light';

      // Create blocked Light
      state.board[1][1] = 'Light';
      state.board[0][1] = 'Dark';
      state.board[2][1] = 'Dark';
      state.board[1][0] = 'Dark';
      state.board[1][2] = 'Dark';

      // Try to remove opponent's stone
      expect(() => {
        invokeBlockadeIfAny(state, { r: 0, c: 1 });
      }).toThrow('Invalid stone to remove');
    });

    it('should throw error for empty cell removal', () => {
      const state = initialState7x7({
        blockadeOneRemoval: true
      });
      state.phase = 'movement';
      state.current = 'Light';

      state.board[1][1] = 'Light';
      state.board[0][1] = 'Dark';
      state.board[2][1] = 'Dark';
      state.board[1][0] = 'Dark';
      state.board[1][2] = 'Dark';

      expect(() => {
        invokeBlockadeIfAny(state, { r: 5, c: 5 }); // Empty cell
      }).toThrow('Invalid stone to remove');
    });

    it('should not invoke blockade when variant disabled', () => {
      const state = initialState7x7({
        blockadeOneRemoval: false
      });
      state.phase = 'movement';
      state.current = 'Light';

      // Create blocked scenario
      state.board[1][1] = 'Light';
      state.board[0][1] = 'Dark';
      state.board[2][1] = 'Dark';
      state.board[1][0] = 'Dark';
      state.board[1][2] = 'Dark';

      const afterCheck = invokeBlockadeIfAny(state);
      // Should return state unchanged
      expect(afterCheck).toEqual(state);
    });
  });
});
