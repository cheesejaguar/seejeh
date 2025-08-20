// FILE: src/tests/rules.spec.ts

import { describe, it, expect } from 'vitest';
import {
  initialState7x7,
  isCenter,
  placementsFor,
  movesFor,
  applyPlacement,
  applyMove,
  resolveCaptures,
  countStones,
  checkWin,
  hasAnyLegalMove
} from '../lib/rules';
import { GameState, Player } from '../lib/types';

describe('Seejeh Rules Engine', () => {
  describe('Board Setup', () => {
    it('should create initial 7x7 state', () => {
      const state = initialState7x7();
      expect(state.board).toHaveLength(7);
      expect(state.board[0]).toHaveLength(7);
      expect(state.current).toBe('Light');
      expect(state.phase).toBe('placement');
      expect(state.stonesToPlace.Light).toBe(24);
      expect(state.stonesToPlace.Dark).toBe(24);
    });

    it('should identify center cell correctly', () => {
      expect(isCenter({ r: 3, c: 3 })).toBe(true);
      expect(isCenter({ r: 0, c: 0 })).toBe(false);
      expect(isCenter({ r: 3, c: 2 })).toBe(false);
    });
  });

  describe('Placement Phase', () => {
    it('should allow valid placements', () => {
      const state = initialState7x7();
      const validPlacements = placementsFor(state, 'Light');
      
      expect(validPlacements).toHaveLength(48); // 49 - 1 center
      expect(validPlacements.every(cell => !isCenter(cell))).toBe(true);
    });

    it('should place stones correctly', () => {
      const state = initialState7x7();
      const newState = applyPlacement(state, { r: 0, c: 0 }, { r: 0, c: 1 });
      
      expect(newState.board[0][0]).toBe('Light');
      expect(newState.board[0][1]).toBe('Light');
      expect(newState.current).toBe('Dark');
      expect(newState.stonesToPlace.Light).toBe(22);
    });

    it('should prevent placement in center', () => {
      const state = initialState7x7();
      
      expect(() => {
        applyPlacement(state, { r: 3, c: 3 }, { r: 0, c: 0 });
      }).toThrow('Cannot place in center during placement phase');
    });

    it('should transition to movement phase when all stones placed', () => {
      let state = initialState7x7();
      state.stonesToPlace = { Light: 2, Dark: 0 };
      
      const newState = applyPlacement(state, { r: 0, c: 0 }, { r: 0, c: 1 });
      expect(newState.phase).toBe('movement');
    });
  });

  describe('Movement Phase', () => {
    it('should find valid moves for a piece', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.board[1][1] = 'Light';
      
      const moves = movesFor(state, { r: 1, c: 1 });
      expect(moves).toContainEqual({ r: 0, c: 1 });
      expect(moves).toContainEqual({ r: 2, c: 1 });
      expect(moves).toContainEqual({ r: 1, c: 0 });
      expect(moves).toContainEqual({ r: 1, c: 2 });
    });

    it('should apply valid moves', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.board[1][1] = 'Light';
      
      const newState = applyMove(state, { r: 1, c: 1 }, { r: 1, c: 2 });
      expect(newState.board[1][1]).toBe(null);
      expect(newState.board[1][2]).toBe('Light');
      expect(newState.current).toBe('Dark');
    });

    it('should prevent diagonal moves', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.board[1][1] = 'Light';
      
      expect(() => {
        applyMove(state, { r: 1, c: 1 }, { r: 2, c: 2 });
      }).toThrow('Must move exactly one orthogonal step');
    });
  });

  describe('Capture Mechanics', () => {
    it('should capture single opponent stone', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      // Setup: Light-Dark-Empty -> Light moves to complete capture
      state.board[1][0] = 'Light';
      state.board[1][1] = 'Dark';
      state.board[1][2] = null;
      
      const captures = resolveCaptures(
        { ...state, board: [
          ...state.board.slice(0, 1),
          ['Light', 'Dark', 'Light', null, null, null, null] as (Player | null)[],
          ...state.board.slice(2)
        ] },
        { r: 1, c: 2 }
      );
      
      expect(captures.captured).toContainEqual({ r: 1, c: 1 });
    });

    it('should capture multiple contiguous stones', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      
      const testBoard = state.board.map(row => [...row]);
      testBoard[1] = ['Light', 'Dark', 'Dark', 'Dark', null, null, null];
      
      const captures = resolveCaptures(
        { ...state, board: testBoard },
        { r: 1, c: 4 }
      );
      
      // Should capture if there's a Light stone at the end
      testBoard[1][4] = 'Light';
      const capturesWithEnd = resolveCaptures(
        { ...state, board: testBoard },
        { r: 1, c: 4 }
      );
      
      expect(capturesWithEnd.captured).toContainEqual({ r: 1, c: 1 });
      expect(capturesWithEnd.captured).toContainEqual({ r: 1, c: 2 });
      expect(capturesWithEnd.captured).toContainEqual({ r: 1, c: 3 });
    });

    it('should not capture center stone', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      
      const testBoard = state.board.map(row => [...row]);
      testBoard[3] = [null, null, 'Light', 'Dark', null, null, null]; // Dark in center
      
      const captures = resolveCaptures(
        { ...state, board: testBoard },
        { r: 3, c: 4 }
      );
      
      // Even with bounding stones, center cannot be captured
      testBoard[3][4] = 'Light';
      const capturesWithBound = resolveCaptures(
        { ...state, board: testBoard },
        { r: 3, c: 4 }
      );
      
      expect(capturesWithBound.captured).not.toContainEqual({ r: 3, c: 3 });
    });

    it('should handle multi-axis captures', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      
      const testBoard = state.board.map(row => [...row]);
      // Create cross pattern with Dark stones around center
      testBoard[2][3] = 'Dark';
      testBoard[4][3] = 'Dark';
      testBoard[3][2] = 'Dark';
      testBoard[3][4] = 'Dark';
      // Light stones to bound
      testBoard[1][3] = 'Light';
      testBoard[5][3] = 'Light';
      testBoard[3][1] = 'Light';
      testBoard[3][5] = 'Light';
      
      const captures = resolveCaptures(
        { ...state, board: testBoard },
        { r: 3, c: 3 } // Move Light to center
      );
      
      // Should capture in multiple directions
      expect(captures.captured.length).toBeGreaterThan(0);
    });
  });

  describe('Win Conditions', () => {
    it('should detect win when opponent has 7 or fewer stones', () => {
      const state = initialState7x7();
      
      // Set up board with Dark having only 7 stones
      for (let i = 0; i < 7; i++) {
        state.board[0][i] = 'Dark';
      }
      // Light has more stones
      for (let i = 0; i < 10; i++) {
        state.board[1][i % 7] = 'Light';
      }
      
      expect(checkWin(state)).toBe('Light');
    });

    it('should count stones correctly', () => {
      const state = initialState7x7();
      state.board[0][0] = 'Light';
      state.board[0][1] = 'Light';
      state.board[1][0] = 'Dark';
      
      expect(countStones(state, 'Light')).toBe(2);
      expect(countStones(state, 'Dark')).toBe(1);
    });
  });

  describe('Blockade Detection', () => {
    it('should detect when player has no legal moves', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      
      // Surround a Light stone with Dark stones
      state.board[1][1] = 'Light';
      state.board[0][1] = 'Dark';
      state.board[2][1] = 'Dark';
      state.board[1][0] = 'Dark';
      state.board[1][2] = 'Dark';
      state.current = 'Light';
      
      expect(hasAnyLegalMove(state, 'Light')).toBe(false);
    });

    it('should detect available moves when they exist', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.board[1][1] = 'Light';
      state.current = 'Light';
      
      expect(hasAnyLegalMove(state, 'Light')).toBe(true);
    });
  });

  describe('Variant Rules', () => {
    it('should enforce first move center constraint when enabled', () => {
      const state = initialState7x7({
        firstMoveMustEnterCenter: true
      });
      state.phase = 'movement';
      state.board[1][1] = 'Light';
      
      // First move not to center should fail
      expect(() => {
        applyMove(state, { r: 1, c: 1 }, { r: 1, c: 2 });
      }).toThrow('First move must enter center');
      
      // First move to center should succeed
      const newState = applyMove(state, { r: 1, c: 1 }, { r: 3, c: 3 });
      expect(newState.board[3][3]).toBe('Light');
    });
  });
});