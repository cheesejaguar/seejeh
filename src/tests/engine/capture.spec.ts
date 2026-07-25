// FILE: src/tests/engine/capture.spec.ts

import { describe, expect, it } from 'vitest';
import {
  CENTER,
  LIGHT,
  applyAction,
  capturesAt,
  previewCaptures,
  toIndex,
} from '../../engine';
import { TACTICAL, apply, capturedBy, position } from './helpers';

describe('custodian capture', () => {
  it('captures a single stone sandwiched by the move', () => {
    // Light steps down into (1,1), trapping Dark(1,2) against Light(1,3).
    const state = position(
      `
      .L.....
      ..DL...
      .......
      .......
      .......
      .......
      .......`,
      'Light',
    );
    const captured = capturedBy(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    expect(captured).toEqual([toIndex(1, 2)]);
  });

  it('captures AT MOST ONE stone per direction — it does not sweep a line', () => {
    // Two contiguous Dark stones backed by Light. Traditional Seega takes
    // nothing here: the stone adjacent to the mover is not backed by a friend.
    // The previous engine swept the whole line, which is the Hasami Shogi rule.
    const state = position(
      `
      .L.....
      ..DDL..
      .......
      .......
      .......
      .......
      .......`,
      'Light',
    );
    const captured = capturedBy(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    expect(captured).toEqual([]);
  });

  it('captures in several directions at once', () => {
    const state = position(
      `
      .......
      ..L....
      ...DL..
      ..D....
      ..L....
      .......
      .......`,
      'Light',
    );
    const captured = capturedBy(state, {
      type: 'move',
      from: toIndex(1, 2),
      to: toIndex(2, 2),
    }).sort((a, b) => a - b);
    expect(captured).toEqual([toIndex(2, 3), toIndex(3, 2)].sort((a, b) => a - b));
  });

  it('never captures the stone that moved into a sandwich', () => {
    const state = position(
      `
      ..L....
      .D.D...
      .......
      .......
      .......
      .......
      .......`,
      'Light',
    );
    const next = apply(state, {
      type: 'move',
      from: toIndex(0, 2),
      to: toIndex(1, 2),
    });
    // The Light stone is flanked left and right by Dark, and survives.
    expect(next.board[toIndex(1, 2)]).toBe(LIGHT);
  });

  it('does not wrap around the board edge', () => {
    // Light(3,0) and Dark(3,6) are on opposite edges; the flat-array
    // representation must not treat them as adjacent.
    const state = position(
      `
      .......
      .......
      .......
      L.....D
      ......L
      .......
      .......`,
      'Light',
    );
    const captured = capturedBy(state, {
      type: 'move',
      from: toIndex(3, 0),
      to: toIndex(2, 0),
    });
    expect(captured).toEqual([]);
  });

  describe('centre safety', () => {
    const diagram = `
      .......
      .......
      ....L..
      ..L.D..
      .......
      .......
      .......`;

    it('protects a stone standing on the centre when enabled', () => {
      // Note: (3,3) is the centre. Dark sits on it here.
      const state = position(
        `
        .......
        .......
        ....L..
        ..LD...
        .......
        .......
        .......`,
        'Light',
        { ...TACTICAL, centerIsSafe: true },
      );
      expect(state.board[CENTER]).toBe(2);
      const captured = capturedBy(state, {
        type: 'move',
        from: toIndex(2, 4),
        to: toIndex(3, 4),
      });
      expect(captured).toEqual([]);
    });

    it('allows the centre stone to be captured when disabled', () => {
      const state = position(
        `
        .......
        .......
        ....L..
        ..LD...
        .......
        .......
        .......`,
        'Light',
        { ...TACTICAL, centerIsSafe: false },
      );
      const captured = capturedBy(state, {
        type: 'move',
        from: toIndex(2, 4),
        to: toIndex(3, 4),
      });
      expect(captured).toEqual([CENTER]);
    });

    it('lets a protected centre stone still act as a capturer', () => {
      // Light on the centre, Dark at (3,4), Light at (3,5): moving the Light
      // stone in from (2,5) traps Dark against the immune centre stone.
      const state = position(
        `
        .......
        .......
        .....L.
        ...LD..
        .......
        .......
        .......`,
        'Light',
        { ...TACTICAL, centerIsSafe: true },
      );
      expect(state.board[CENTER]).toBe(LIGHT);
      const captured = capturedBy(state, {
        type: 'move',
        from: toIndex(2, 5),
        to: toIndex(3, 5),
      });
      expect(captured).toEqual([toIndex(3, 4)]);
      expect(diagram).toBeTruthy();
    });
  });

  it('previewCaptures agrees with the captures the move actually makes', () => {
    const state = position(
      `
      .L.....
      ..DL...
      .......
      .......
      .......
      .......
      .......`,
      'Light',
    );
    const from = toIndex(0, 1);
    const to = toIndex(1, 1);
    const preview = previewCaptures(state.board, from, to, 'Light', true);
    const actual = capturedBy(state, { type: 'move', from, to });
    expect(preview).toEqual(actual);
  });

  it('capturesAt reads the post-move board, not a stale origin square', () => {
    const state = position(
      `
      .L.....
      ..DL...
      .......
      .......
      .......
      .......
      .......`,
      'Light',
    );
    const result = applyAction(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // After the capture resolves there is nothing further to take.
    expect(capturesAt(result.state.board, toIndex(1, 1), 'Light', true)).toEqual([]);
  });
});
