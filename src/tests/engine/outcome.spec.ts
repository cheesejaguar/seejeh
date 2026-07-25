// FILE: src/tests/engine/outcome.spec.ts

import { describe, expect, it } from 'vitest';
import { applyAction, createGame, toIndex } from '../../engine';
import { TACTICAL, apply, expectReject, position } from './helpers';

describe('win conditions', () => {
  it('wins by elimination when the last enemy stone is captured', () => {
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
      { ...TACTICAL, loneStoneLoses: false },
    );
    const next = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    expect(next.outcome).toEqual({
      kind: 'win',
      winner: 'Light',
      reason: 'elimination',
    });
    expect(next.phase).toBe('gameOver');
  });

  it('wins by the lone-stone rule when enabled', () => {
    const state = position(
      `
      .L.....
      ..DL...
      .......
      .......
      .......
      .......
      ......D`,
      'Light',
      { ...TACTICAL, loneStoneLoses: true },
    );
    const next = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    expect(next.outcome).toEqual({
      kind: 'win',
      winner: 'Light',
      reason: 'loneStone',
    });
  });

  it('keeps playing at one stone when the lone-stone rule is off', () => {
    const state = position(
      `
      .L.....
      ..DL...
      .......
      .......
      .......
      .......
      ......D`,
      'Light',
      { ...TACTICAL, loneStoneLoses: false },
    );
    const next = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    expect(next.outcome).toBeNull();
  });

  it('never reports a winner during the placement phase', () => {
    // The old engine's checkWin compared board stone counts against a
    // threshold, so on an empty board it declared a winner immediately.
    let state = createGame();
    expect(state.outcome).toBeNull();
    for (let i = 0; i < 12; i++) {
      state = apply(state, { type: 'place', at: i });
      expect(state.outcome).toBeNull();
    }
  });

  it('has no "reduced to 7 stones" rule — that threshold is not a Seejeh rule', () => {
    // 8 Light vs 7 Dark: play continues. No source in any language attests a
    // seven-stone threshold; it originated in this repo's own README.
    const state = position(
      `
      LLLLLLL
      L......
      .......
      .......
      .......
      ......D
      DDDDDD.`,
      'Light',
      { ...TACTICAL, loneStoneLoses: true },
    );
    const next = apply(state, {
      type: 'move',
      from: toIndex(1, 0),
      to: toIndex(2, 0),
    });
    expect(next.outcome).toBeNull();
  });
});

describe('resignation and draw offers', () => {
  it('resignation hands the win to the opponent', () => {
    const state = createGame();
    const next = apply(state, { type: 'resign', player: 'Light' });
    expect(next.outcome).toEqual({
      kind: 'win',
      winner: 'Dark',
      reason: 'resignation',
    });
  });

  it('a draw offer must be accepted by the OTHER player', () => {
    const offered = apply(createGame(), { type: 'offerDraw', player: 'Light' });
    expect(offered.drawOffer).toBe('Light');
    expect(expectReject(offered, { type: 'acceptDraw', player: 'Light' })).toBe(
      'noDrawOffer',
    );

    const drawn = apply(offered, { type: 'acceptDraw', player: 'Dark' });
    expect(drawn.outcome).toEqual({ kind: 'draw', reason: 'agreement' });
  });

  it('declining clears the offer and play continues', () => {
    const offered = apply(createGame(), { type: 'offerDraw', player: 'Light' });
    const declined = apply(offered, { type: 'declineDraw', player: 'Dark' });
    expect(declined.drawOffer).toBeNull();
    expect(declined.outcome).toBeNull();
  });

  it('rejects accepting when no offer exists', () => {
    expect(expectReject(createGame(), { type: 'acceptDraw', player: 'Dark' })).toBe(
      'noDrawOffer',
    );
  });
});

describe('draw by no progress and repetition', () => {
  it('adjudicates on material after the quiet-ply limit', () => {
    // Light has more stones, so the no-progress rule awards Light the win.
    let state = position(
      `
      LL.....
      LL.....
      .......
      .......
      .......
      .......
      .....DD`,
      'Light',
      { ...TACTICAL, noProgressLimit: 4, loneStoneLoses: false },
    );

    const shuffle: Array<[number, number]> = [
      [toIndex(1, 1), toIndex(1, 2)],
      [toIndex(6, 5), toIndex(5, 5)],
      [toIndex(1, 2), toIndex(1, 1)],
      [toIndex(5, 5), toIndex(6, 5)],
    ];
    for (const [from, to] of shuffle) {
      if (state.outcome) break;
      const result = applyAction(state, { type: 'move', from, to });
      if (!result.ok) break;
      state = result.state;
    }
    expect(state.outcome).not.toBeNull();
    expect(state.outcome?.kind).toBe('win');
    if (state.outcome?.kind === 'win') {
      expect(state.outcome.winner).toBe('Light');
      expect(state.outcome.reason).toBe('material');
    }
  });

  it('declares a draw on threefold repetition', () => {
    // Symmetric material so repetition is a genuine draw, and both sides
    // simply shuffle a stone back and forth.
    let state = position(
      `
      LL.....
      .......
      .......
      .......
      .......
      .......
      .....DD`,
      'Light',
      {
        ...TACTICAL,
        repetitionDraw: true,
        noProgressLimit: 0,
        loneStoneLoses: false,
      },
    );

    const cycle: Array<[number, number]> = [
      [toIndex(0, 0), toIndex(1, 0)],
      [toIndex(6, 5), toIndex(5, 5)],
      [toIndex(1, 0), toIndex(0, 0)],
      [toIndex(5, 5), toIndex(6, 5)],
    ];

    for (let round = 0; round < 6 && !state.outcome; round++) {
      for (const [from, to] of cycle) {
        if (state.outcome) break;
        const result = applyAction(state, { type: 'move', from, to });
        if (!result.ok) break;
        state = result.state;
      }
    }

    expect(state.outcome).toEqual({ kind: 'draw', reason: 'repetition' });
  });

  it('a capture clears the repetition history, since it is irreversible', () => {
    const state = position(
      `
      .L.....
      ..DL...
      .......
      .......
      .......
      .......
      ......D`,
      'Light',
      { ...TACTICAL, loneStoneLoses: false, repetitionDraw: true },
    );
    const next = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    const keys = Object.keys(next.positionCounts);
    expect(keys.length).toBeLessThanOrEqual(1);
  });
});

describe('actions after the game ends', () => {
  it('rejects further moves once there is an outcome', () => {
    const finished = apply(createGame(), { type: 'resign', player: 'Light' });
    expect(expectReject(finished, { type: 'place', at: 0 })).toBe('gameOver');
    expect(expectReject(finished, { type: 'move', from: 0, to: 1 })).toBe('gameOver');
    expect(expectReject(finished, { type: 'resign', player: 'Dark' })).toBe('gameOver');
  });
});
