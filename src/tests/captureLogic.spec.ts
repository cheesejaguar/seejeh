// FILE: src/tests/captureLogic.spec.ts

import { describe, it, expect } from 'vitest';
import {
  initialState7x7,
  resolveCaptures,
  previewCaptures,
  isCenter
} from '../lib/rules';
import { Player } from '../lib/types';

describe('Capture Logic', () => {
  describe('Single Direction Captures', () => {
    it('should capture horizontally to the left', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // [Light moves here](2,2) - Dark(2,1) - Light(2,0)
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[2][2] = 'Light'; // Moved here

      const captures = resolveCaptures(state, { r: 2, c: 2 });
      expect(captures.captured).toContainEqual({ r: 2, c: 1 });
    });

    it('should capture horizontally to the right', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Light(2,2) - Dark(2,3) - [Light moves here](2,4)
      state.board[2][2] = 'Light';
      state.board[2][3] = 'Dark';
      state.board[2][4] = 'Light'; // Moved here

      const captures = resolveCaptures(state, { r: 2, c: 4 });
      expect(captures.captured).toContainEqual({ r: 2, c: 3 });
    });

    it('should capture vertically upward', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Light(0,2) - Dark(1,2) - [Light moves here](2,2)
      state.board[0][2] = 'Light';
      state.board[1][2] = 'Dark';
      state.board[2][2] = 'Light'; // Moved here

      const captures = resolveCaptures(state, { r: 2, c: 2 });
      expect(captures.captured).toContainEqual({ r: 1, c: 2 });
    });

    it('should capture vertically downward', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // [Light moves here](2,2) - Dark(3,2) - Light(4,2)
      state.board[2][2] = 'Light'; // Moved here
      state.board[3][2] = 'Dark';
      state.board[4][2] = 'Light';

      const captures = resolveCaptures(state, { r: 2, c: 2 });
      expect(captures.captured).toContainEqual({ r: 3, c: 2 });
    });
  });

  describe('Multiple Contiguous Stone Captures', () => {
    it('should capture two contiguous stones', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Light(2,0) - Dark(2,1) - Dark(2,2) - [Light moves here](2,3)
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[2][2] = 'Dark';
      state.board[2][3] = 'Light'; // Moved here

      const captures = resolveCaptures(state, { r: 2, c: 3 });
      expect(captures.captured).toContainEqual({ r: 2, c: 1 });
      expect(captures.captured).toContainEqual({ r: 2, c: 2 });
      expect(captures.captured.length).toBe(2);
    });

    it('should capture three contiguous stones', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Light(2,0) - Dark(2,1) - Dark(2,2) - Dark(2,3) - [Light moves here](2,4)
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[2][2] = 'Dark';
      state.board[2][3] = 'Dark';
      state.board[2][4] = 'Light'; // Moved here

      const captures = resolveCaptures(state, { r: 2, c: 4 });
      expect(captures.captured.length).toBe(3);
    });
  });

  describe('Multi-Axis Captures', () => {
    it('should capture in two directions simultaneously', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Horizontal: Light(2,0) - Dark(2,1) - [Light at](2,2)
      // Vertical: Light(0,2) - Dark(1,2) - [Light at](2,2)
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[0][2] = 'Light';
      state.board[1][2] = 'Dark';
      state.board[2][2] = 'Light'; // Moved here

      const captures = resolveCaptures(state, { r: 2, c: 2 });
      expect(captures.captured).toContainEqual({ r: 2, c: 1 });
      expect(captures.captured).toContainEqual({ r: 1, c: 2 });
      expect(captures.captured.length).toBe(2);
    });

    it('should capture in all four directions', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Setup cross pattern around (3,3)
      state.board[2][3] = 'Dark'; // Up from center
      state.board[4][3] = 'Dark'; // Down from center
      state.board[3][2] = 'Dark'; // Left of center
      state.board[3][4] = 'Dark'; // Right of center

      // Bounding Light pieces
      state.board[1][3] = 'Light';
      state.board[5][3] = 'Light';
      state.board[3][1] = 'Light';
      state.board[3][5] = 'Light';

      // Light moves to center
      state.board[3][3] = 'Light';

      const captures = resolveCaptures(state, { r: 3, c: 3 });
      expect(captures.captured.length).toBe(4);
    });
  });

  describe('Center Cell Immunity', () => {
    it('should not capture piece on center cell', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Light(3,1) - Dark(3,2) - Dark(center 3,3) - Dark(3,4) - [Light moves](3,5)
      state.board[3][1] = 'Light';
      state.board[3][2] = 'Dark';
      state.board[3][3] = 'Dark'; // Center - immune
      state.board[3][4] = 'Dark';
      state.board[3][5] = 'Light';

      const captures = resolveCaptures(state, { r: 3, c: 5 });

      // Should capture 3,4 but not 3,3 (center)
      // However, the capture line is broken by the immune center
      // So actually nothing should be captured because the line isn't bounded
      expect(captures.captured).not.toContainEqual({ r: 3, c: 3 });
    });

    it('should allow using center piece to make captures', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Light in center can help capture
      state.board[3][3] = 'Light'; // Center
      state.board[3][4] = 'Dark';
      state.board[3][5] = 'Light';

      const captures = resolveCaptures(state, { r: 3, c: 5 });
      expect(captures.captured).toContainEqual({ r: 3, c: 4 });
    });
  });

  describe('No Capture Scenarios', () => {
    it('should not capture without bounding stone', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // [Light moves here](2,2) - Dark(2,3) - Empty(2,4)
      state.board[2][2] = 'Light';
      state.board[2][3] = 'Dark';

      const captures = resolveCaptures(state, { r: 2, c: 2 });
      expect(captures.captured.length).toBe(0);
    });

    it('should not capture own pieces', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // [Light moves here](2,2) - Light(2,3) - Light(2,4)
      state.board[2][2] = 'Light';
      state.board[2][3] = 'Light';
      state.board[2][4] = 'Light';

      const captures = resolveCaptures(state, { r: 2, c: 2 });
      expect(captures.captured.length).toBe(0);
    });

    it('should not capture at board edge without bounding', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Edge scenario: Dark(0,0) - [Light moves](0,1)
      state.board[0][0] = 'Dark';
      state.board[0][1] = 'Light';

      const captures = resolveCaptures(state, { r: 0, c: 1 });
      expect(captures.captured.length).toBe(0);
    });
  });

  describe('Capture Preview', () => {
    it('should preview single capture correctly', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Light(2,0) - Dark(2,1) - Empty(2,2) - Light can preview move to 2,2
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[2][3] = 'Light'; // Piece to move

      const preview = previewCaptures(state, { r: 2, c: 3 }, { r: 2, c: 2 });
      expect(preview).toContainEqual({ r: 2, c: 1 });
    });

    it('should preview multi-axis capture correctly', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      // Setup for multi-axis capture
      state.board[2][0] = 'Light';
      state.board[2][1] = 'Dark';
      state.board[0][2] = 'Light';
      state.board[1][2] = 'Dark';
      state.board[3][2] = 'Light'; // Piece to move

      const preview = previewCaptures(state, { r: 3, c: 2 }, { r: 2, c: 2 });
      expect(preview.length).toBe(2);
    });

    it('should return empty for invalid move', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      state.board[2][2] = 'Light';

      // Try to preview diagonal move (invalid)
      const preview = previewCaptures(state, { r: 2, c: 2 }, { r: 3, c: 3 });
      expect(preview.length).toBe(0);
    });

    it('should return empty for occupied destination', () => {
      const state = initialState7x7();
      state.phase = 'movement';
      state.current = 'Light';

      state.board[2][2] = 'Light';
      state.board[2][3] = 'Dark'; // Destination occupied

      const preview = previewCaptures(state, { r: 2, c: 2 }, { r: 2, c: 3 });
      expect(preview.length).toBe(0);
    });
  });

  describe('Edge and Corner Cases', () => {
    it('should capture at corner', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Light(0,0) - Dark(0,1) - [Light moves](0,2)
      state.board[0][0] = 'Light';
      state.board[0][1] = 'Dark';
      state.board[0][2] = 'Light';

      const captures = resolveCaptures(state, { r: 0, c: 2 });
      expect(captures.captured).toContainEqual({ r: 0, c: 1 });
    });

    it('should handle capture at board edge', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Vertical capture at edge
      // Light(0,6) - Dark(1,6) - [Light moves](2,6)
      state.board[0][6] = 'Light';
      state.board[1][6] = 'Dark';
      state.board[2][6] = 'Light';

      const captures = resolveCaptures(state, { r: 2, c: 6 });
      expect(captures.captured).toContainEqual({ r: 1, c: 6 });
    });

    it('should handle capture at bottom edge', () => {
      const state = initialState7x7();
      state.phase = 'movement';

      // Light(6,0) - Dark(6,1) - [Light moves](6,2)
      state.board[6][0] = 'Light';
      state.board[6][1] = 'Dark';
      state.board[6][2] = 'Light';

      const captures = resolveCaptures(state, { r: 6, c: 2 });
      expect(captures.captured).toContainEqual({ r: 6, c: 1 });
    });
  });
});
