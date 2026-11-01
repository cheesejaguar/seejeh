// FILE: src/tests/gameSimulation.spec.ts

import { describe, it, expect } from 'vitest';
import {
  initialState7x7,
  applyPlacement,
  applyMove,
  applyChainStep,
  endChain,
  checkWin,
  countStones,
  hasAnyLegalMove,
  isCenter
} from '../lib/rules';
import { GameState, Player } from '../lib/types';

describe('Full Game Simulations', () => {
  describe('Placement Phase Simulation', () => {
    it('should complete full placement phase', () => {
      let state = initialState7x7();

      // Place all 48 stones (24 per player)
      let placements = 0;
      let row = 0;
      let col = 0;

      while (state.phase === 'placement' && placements < 48) {
        // Find two empty non-center cells
        const cells: { r: number; c: number }[] = [];

        while (cells.length < 2 && row < 7) {
          if (!isCenter({ r: row, c: col }) && state.board[row][col] === null) {
            cells.push({ r: row, c: col });
          }
          col++;
          if (col >= 7) {
            col = 0;
            row++;
          }
        }

        if (cells.length === 2) {
          state = applyPlacement(state, cells[0], cells[1]);
          placements += 2;
        } else if (cells.length === 1) {
          // Handle odd case at end
          state = applyPlacement(state, cells[0], cells[0]);
          placements += 1;
        } else {
          break;
        }
      }

      expect(state.phase).toBe('movement');
      expect(state.stonesToPlace.Light).toBe(0);
      expect(state.stonesToPlace.Dark).toBe(0);
    });

    it('should alternate between players during placement', () => {
      let state = initialState7x7();

      expect(state.current).toBe('Light');

      state = applyPlacement(state, { r: 0, c: 0 }, { r: 0, c: 1 });
      expect(state.current).toBe('Dark');

      state = applyPlacement(state, { r: 1, c: 0 }, { r: 1, c: 1 });
      expect(state.current).toBe('Light');
    });
  });

  describe('Movement Phase Simulation', () => {
    it('should complete a simple capture sequence', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Horizontal capture: Light(2,0) - Dark(2,1) - [move here](2,2)
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[2][3] = 'Light';

      const afterMove = applyMove(state, { r: 2, c: 3 }, { r: 2, c: 2 });

      expect(afterMove.capturedLastMove).toEqual([{ r: 2, c: 1 }]);
      expect(afterMove.board[2][1]).toBe(null);
      expect(afterMove.board[2][2]).toBe('Light');
    });

    it('should simulate multiple turns', () => {
      let state = initialState7x7();
      state.phase = 'movement';

      // Setup initial position
      state.board[0][0] = 'Light';
      state.board[0][2] = 'Light';
      state.board[6][6] = 'Dark';
      state.board[6][4] = 'Dark';
      state.current = 'Light';

      // Turn 1: Light moves
      state = applyMove(state, { r: 0, c: 0 }, { r: 0, c: 1 });
      expect(state.current).toBe('Dark');

      // Turn 2: Dark moves
      state = applyMove(state, { r: 6, c: 6 }, { r: 6, c: 5 });
      expect(state.current).toBe('Light');

      // Turn 3: Light moves
      state = applyMove(state, { r: 0, c: 1 }, { r: 1, c: 1 });
      expect(state.current).toBe('Dark');
    });
  });

  describe('Chain Capture Simulation', () => {
    it('should complete a double capture chain', () => {
      let state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Filler stones keep both sides above the 7-stone loss threshold
      for (let c = 0; c < 7; c++) {
        state.board[6][c] = 'Light';
        state.board[4][c] = 'Dark';
      }
      state.board[5][0] = 'Light';
      state.board[5][3] = 'Dark';
      state.board[5][4] = 'Dark';

      // Capture 1: Light(2,0) - Dark(2,1) - [move to](2,2)
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[1][2] = 'Light'; // Piece to move
      // Capture 2, after chain step to (2,3): Light(0,3) - Dark(1,3) - [at](2,3)
      state.board[0][3] = 'Light';
      state.board[1][3] = 'Dark';

      const darkBefore = countStones(state, 'Dark');

      // Move 1: capture first Dark
      state = applyMove(state, { r: 1, c: 2 }, { r: 2, c: 2 });
      expect(state.phase).toBe('chain');
      expect(state.capturedLastMove).toEqual([{ r: 2, c: 1 }]);

      // Chain step: capture second Dark
      state = applyChainStep(state, { r: 2, c: 3 });
      expect(state.phase).toBe('chain');
      expect(state.capturedLastMove).toEqual([{ r: 1, c: 3 }]);
      expect(state.board[1][3]).toBe(null);
      expect(countStones(state, 'Dark')).toBe(darkBefore - 2);
      expect(state.winner).toBeUndefined();

      // End the chain
      state = endChain(state);
      expect(state.phase).toBe('movement');
      expect(state.current).toBe('Dark');
    });

    it('should allow ending chain early', () => {
      let state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Setup capture
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[2][3] = 'Light';

      // Make capture
      state = applyMove(state, { r: 2, c: 3 }, { r: 2, c: 2 });
      expect(state.phase).toBe('chain');

      // End chain immediately
      state = endChain(state);
      expect(state.phase).toBe('movement');
      expect(state.current).toBe('Dark');
    });
  });

  describe('Win Condition Simulation', () => {
    it('should not declare victory while opponent keeps 8 stones', () => {
      let state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Setup: Light has many stones, Dark has exactly 8
      for (let i = 0; i < 15; i++) {
        state.board[Math.floor(i / 7)][i % 7] = 'Light';
      }
      state.board[5][0] = 'Dark';
      state.board[5][1] = 'Dark';
      state.board[5][2] = 'Dark';
      state.board[5][3] = 'Dark';
      state.board[5][4] = 'Dark';
      state.board[5][5] = 'Dark';
      state.board[5][6] = 'Dark';
      state.board[6][0] = 'Dark';
      // Dark has 8 stones

      // Setup capture to reduce Dark to 7
      state.board[4][0] = 'Light';
      state.board[4][2] = 'Light';
      state.board[4][1] = 'Dark'; // Will be captured

      // Before capture: Dark has 9 stones
      expect(countStones(state, 'Dark')).toBe(9);

      // Make capturing move
      // Need Light piece adjacent to (4,2) to move
      state.board[4][3] = 'Light';
      state.board[4][2] = null;

      const afterCapture = applyMove(state, { r: 4, c: 3 }, { r: 4, c: 2 });

      // After capture: Dark should have 8 stones (one captured), not yet a loss
      expect(afterCapture.capturedLastMove).toEqual([{ r: 4, c: 1 }]);
      expect(countStones(afterCapture, 'Dark')).toBe(8);
      expect(afterCapture.winner).toBeUndefined();
    });

    it('should trigger win when opponent reduced to 7 stones', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Light has 10 stones
      for (let c = 0; c < 7; c++) {
        state.board[0][c] = 'Light';
      }
      state.board[1][0] = 'Light';
      state.board[1][1] = 'Light';
      state.board[1][2] = 'Light';

      // Dark has exactly 8 stones
      for (let c = 0; c < 7; c++) {
        state.board[5][c] = 'Dark';
      }
      state.board[4][3] = 'Dark'; // 8th stone - will be captured

      // Setup capture: Light(4,2) - Dark(4,3) - Light(4,4) (bounding piece)
      state.board[4][2] = 'Light';
      state.board[4][5] = 'Light'; // Piece to move

      const afterCapture = applyMove(state, { r: 4, c: 5 }, { r: 4, c: 4 });

      // After capture, Dark has 7 stones - should trigger win
      expect(countStones(afterCapture, 'Dark')).toBe(7);
      expect(afterCapture.winner).toBe('Light');
      expect(afterCapture.winReason).toEqual({
        type: 'stoneCount',
        loserStoneCount: 7,
        threshold: 7,
        loser: 'Dark'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle piece on center (immune to capture)', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Dark piece in center
      state.board[3][3] = 'Dark';

      // Light(3,2) - Dark(center) - [Light moves here](3,4)
      state.board[3][2] = 'Light';
      state.board[2][4] = 'Light'; // Piece to move

      const afterMove = applyMove(state, { r: 2, c: 4 }, { r: 3, c: 4 });

      // Center piece should still be there
      expect(afterMove.board[3][3]).toBe('Dark');
      expect(afterMove.capturedLastMove).toEqual([]);
      expect(afterMove.phase).toBe('movement');
    });

    it('should handle moving between two enemy pieces (safe entry)', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Dark-Empty-Dark pattern
      state.board[2][1] = 'Dark';
      state.board[2][3] = 'Dark';
      state.board[1][2] = 'Light';

      // Move Light between Dark pieces
      const afterMove = applyMove(state, { r: 1, c: 2 }, { r: 2, c: 2 });

      // Light should not be captured (safe entry)
      expect(afterMove.board[2][2]).toBe('Light');
      expect(afterMove.capturedLastMove).toHaveLength(0);
    });

    it('should capture multiple pieces in single move', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Light at (2,3) moves into the center and closes three lines at once:
      // down to Light(5,3), left to Light(3,1), right to Light(3,5)
      state.board[2][3] = 'Light'; // Piece to move
      state.board[4][3] = 'Dark';
      state.board[3][2] = 'Dark';
      state.board[3][4] = 'Dark';
      state.board[5][3] = 'Light';
      state.board[3][1] = 'Light';
      state.board[3][5] = 'Light';

      const afterMove = applyMove(state, { r: 2, c: 3 }, { r: 3, c: 3 });

      expect(afterMove.capturedLastMove).toHaveLength(3);
      expect(afterMove.capturedLastMove).toEqual(expect.arrayContaining([
        { r: 4, c: 3 },
        { r: 3, c: 2 },
        { r: 3, c: 4 }
      ]));
      expect(countStones(afterMove, 'Dark')).toBe(0);
    });
  });

  describe('Game State Integrity', () => {
    it('should maintain immutable state during moves', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.board[1][1] = 'Light';
      state.current = 'Light';

      const originalBoard = JSON.stringify(state.board);

      const newState = applyMove(state, { r: 1, c: 1 }, { r: 1, c: 2 });

      // Original state should be unchanged
      expect(JSON.stringify(state.board)).toBe(originalBoard);
      expect(state.board[1][1]).toBe('Light');
      expect(state.board[1][2]).toBe(null);

      // New state should have the move
      expect(newState.board[1][1]).toBe(null);
      expect(newState.board[1][2]).toBe('Light');
    });

    it('should track move history correctly', () => {
      let state = initialState7x7();
      state.phase = 'movement';
      state.board[1][1] = 'Light';
      state.current = 'Light';

      state = applyMove(state, { r: 1, c: 1 }, { r: 1, c: 2 });

      expect(state.moveHistory).toHaveLength(1);
      expect(state.moveHistory[0].from).toEqual({ r: 1, c: 1 });
      expect(state.moveHistory[0].to).toEqual({ r: 1, c: 2 });
    });
  });
});
