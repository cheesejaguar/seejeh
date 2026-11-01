// FILE: src/tests/winConditions.spec.ts

import { describe, it, expect } from 'vitest';
import {
  initialState7x7,
  checkWin,
  countStones,
  offerStalemate,
  rejectStalemate,
  resignGame,
  detectStalemate,
  hasAnyLegalMove
} from '../lib/rules';
import { Player } from '../lib/types';

describe('Win Conditions', () => {
  describe('Stone Count Victory', () => {
    it('should declare Light winner when Dark has exactly 7 stones', () => {
      const state = initialState7x7();

      // Dark has exactly 7 stones
      for (let i = 0; i < 7; i++) {
        state.board[0][i] = 'Dark';
      }
      // Light has 8+ stones
      for (let i = 0; i < 7; i++) {
        state.board[1][i] = 'Light';
      }
      state.board[2][0] = 'Light';

      const result = checkWin(state);
      expect(result?.winner).toBe('Light');
      expect(result?.reason.type).toBe('stoneCount');
    });

    it('should declare Dark winner when Light has exactly 7 stones', () => {
      const state = initialState7x7();

      // Light has exactly 7 stones
      for (let i = 0; i < 7; i++) {
        state.board[0][i] = 'Light';
      }
      // Dark has 8+ stones
      for (let i = 0; i < 7; i++) {
        state.board[1][i] = 'Dark';
      }
      state.board[2][0] = 'Dark';

      const result = checkWin(state);
      expect(result?.winner).toBe('Dark');
      expect(result?.reason.type).toBe('stoneCount');
    });

    it('should declare Light winner when Dark has fewer than 7 stones', () => {
      const state = initialState7x7();

      // Dark has only 5 stones
      for (let i = 0; i < 5; i++) {
        state.board[0][i] = 'Dark';
      }
      // Light has 10 stones
      for (let i = 0; i < 7; i++) {
        state.board[1][i] = 'Light';
      }
      for (let i = 0; i < 3; i++) {
        state.board[2][i] = 'Light';
      }

      const result = checkWin(state);
      expect(result?.winner).toBe('Light');
    });

    it('should not declare winner when both have more than 7 stones', () => {
      const state = initialState7x7();

      // Both have 10 stones
      for (let i = 0; i < 7; i++) {
        state.board[0][i] = 'Dark';
        state.board[1][i] = 'Light';
      }
      for (let i = 0; i < 3; i++) {
        state.board[2][i] = 'Dark';
        state.board[3][i] = 'Light';
      }

      const result = checkWin(state);
      expect(result).toBeUndefined();
    });

    it('should include correct loser stone count in reason', () => {
      const state = initialState7x7();

      for (let i = 0; i < 5; i++) {
        state.board[0][i] = 'Dark';
      }
      for (let i = 0; i < 10; i++) {
        state.board[1][i % 7] = 'Light';
        if (i >= 7) state.board[2][i - 7] = 'Light';
      }

      const result = checkWin(state);
      expect(result?.reason.type).toBe('stoneCount');
      if (result?.reason.type === 'stoneCount') {
        expect(result.reason.loserStoneCount).toBe(5);
        expect(result.reason.loser).toBe('Dark');
      }
    });
  });

  describe('Stalemate', () => {
    it('should accept mutual stalemate offer', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Add stones so checkWin doesn't trigger early (need > 7 stones each)
      // Light has 10 stones in rows 0-1
      for (let c = 0; c < 7; c++) {
        state.board[0][c] = 'Light';
      }
      state.board[1][0] = 'Light';
      state.board[1][1] = 'Light';
      state.board[1][2] = 'Light';

      // Dark has 10 stones in rows 5-4
      for (let c = 0; c < 7; c++) {
        state.board[5][c] = 'Dark';
      }
      state.board[4][0] = 'Dark';
      state.board[4][1] = 'Dark';
      state.board[4][2] = 'Dark';

      // Light offers stalemate
      const afterLightOffer = offerStalemate(state);
      expect(afterLightOffer.stalemateOffers.Light).toBe(true);
      expect(afterLightOffer.winner).toBeUndefined();

      // Dark offers stalemate (mutual agreement)
      const afterDarkOffer = offerStalemate({
        ...afterLightOffer,
        current: 'Dark'
      });
      expect(afterDarkOffer.stalemateOffers.Dark).toBe(true);
      // 10 stones each, so the agreed stalemate is a draw
      expect(afterDarkOffer.winner).toBe(null);
      expect(afterDarkOffer.winReason).toEqual({ type: 'stalemate', drawType: 'mutual' });
    });

    it('should determine winner by stone count in stalemate', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Light has more stones
      for (let i = 0; i < 12; i++) {
        state.board[Math.floor(i / 7)][i % 7] = 'Light';
      }
      for (let i = 0; i < 10; i++) {
        state.board[3 + Math.floor(i / 7)][i % 7] = 'Dark';
      }

      // Both offer stalemate
      state.stalemateOffers = { Light: true, Dark: true };

      const result = checkWin(state);
      expect(result?.winner).toBe('Light');
      expect(result?.reason.type).toBe('stalemate');
    });

    it('should declare draw when equal stones in stalemate', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Equal stones
      for (let i = 0; i < 10; i++) {
        state.board[Math.floor(i / 7)][i % 7] = 'Light';
        state.board[3 + Math.floor(i / 7)][i % 7] = 'Dark';
      }

      state.stalemateOffers = { Light: true, Dark: true };

      const result = checkWin(state);
      expect(result?.winner).toBe(null); // Draw
      expect(result?.reason.type).toBe('stalemate');
    });

    it('should allow rejecting stalemate offer', () => {
      const state = initialState7x7();
      state.stalemateOffers = { Light: true, Dark: false };

      const afterReject = rejectStalemate(state, 'Light');
      expect(afterReject.stalemateOffers.Light).toBe(false);
    });
  });

  describe('Resignation', () => {
    it('should declare opponent winner when Light resigns', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      const newState = resignGame(state, 'Light');

      expect(newState.winner).toBe('Dark');
      expect(newState.winReason?.type).toBe('resignation');
      if (newState.winReason?.type === 'resignation') {
        expect(newState.winReason.resignedPlayer).toBe('Light');
      }
    });

    it('should declare opponent winner when Dark resigns', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      const newState = resignGame(state, 'Dark');

      expect(newState.winner).toBe('Light');
      expect(newState.winReason?.type).toBe('resignation');
    });
  });

  describe('Repetition Detection', () => {
    it('should detect stalemate by repetition', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.moveRepetition = 6; // Threshold for repetition

      // Add stones to board
      for (let i = 0; i < 12; i++) {
        state.board[Math.floor(i / 7)][i % 7] = 'Light';
        state.board[3 + Math.floor(i / 7)][i % 7] = 'Dark';
      }

      const result = checkWin(state);
      expect(result?.reason.type).toBe('stalemate');
      if (result?.reason.type === 'stalemate') {
        expect(result.reason.drawType).toBe('repetition');
      }
    });
  });

  describe('No Legal Moves Stalemate', () => {
    // Fill every cell, alternating colours: Light gets 25 cells, Dark 24
    const fullBoard = (even: Player, odd: Player) => {
      const state = initialState7x7();
      state.phase = 'movement';
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          state.board[r][c] = (r + c) % 2 === 0 ? even : odd;
        }
      }
      return state;
    };

    it('should detect when neither player can move', () => {
      const state = fullBoard('Light', 'Dark');

      expect(hasAnyLegalMove(state, 'Light')).toBe(false);
      expect(hasAnyLegalMove(state, 'Dark')).toBe(false);

      const stalemate = detectStalemate(state);
      expect(stalemate.winReason).toEqual({ type: 'stalemate', drawType: 'insufficient' });
    });

    it('should award victory to player with more stones when both blocked', () => {
      const lightMajority = detectStalemate(fullBoard('Light', 'Dark'));
      expect(lightMajority.winner).toBe('Light');

      const darkMajority = detectStalemate(fullBoard('Dark', 'Light'));
      expect(darkMajority.winner).toBe('Dark');
    });

    it('should not end the game when only the player on turn is blocked', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Every Light stone is boxed in, but Dark can still move.
      // Both sides keep more than 7 stones so no other end condition applies.
      state.board[0][0] = 'Light';
      state.board[0][1] = 'Dark';
      state.board[1][0] = 'Dark';
      for (let c = 0; c < 7; c++) {
        state.board[6][c] = 'Light';
        state.board[5][c] = 'Dark';
      }

      expect(hasAnyLegalMove(state, 'Light')).toBe(false);
      expect(hasAnyLegalMove(state, 'Dark')).toBe(true);

      // This is a blockade for Light, not a mutual stalemate
      const result = detectStalemate(state);
      expect(result.winner).toBeUndefined();
      expect(result.winReason).toBeUndefined();
    });
  });

  describe('Stone Counting', () => {
    it('should count Light stones correctly', () => {
      const state = initialState7x7();
      state.board[0][0] = 'Light';
      state.board[2][3] = 'Light';
      state.board[5][6] = 'Light';

      expect(countStones(state, 'Light')).toBe(3);
    });

    it('should count Dark stones correctly', () => {
      const state = initialState7x7();
      state.board[1][1] = 'Dark';
      state.board[3][3] = 'Dark';

      expect(countStones(state, 'Dark')).toBe(2);
    });

    it('should return 0 for empty board', () => {
      const state = initialState7x7();

      expect(countStones(state, 'Light')).toBe(0);
      expect(countStones(state, 'Dark')).toBe(0);
    });
  });
});
