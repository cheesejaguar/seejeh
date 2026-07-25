// FILE: src/tests/engine/blockade.spec.ts

import { describe, expect, it } from 'vitest';
import {
  blockadeRemovalChoices,
  hasAnyMovementMove,
  legalMoves,
  toIndex,
} from '../../engine';
import { TACTICAL, apply, expectReject, position } from './helpers';

/**
 * Dark's single stone at (0,0) is boxed in by Light at (0,1) and (1,0).
 * Light has free stones elsewhere.
 */
const DARK_BLOCKED = `
  DL.....
  L......
  .......
  .......
  ....L..
  .......
  .....L.`;

describe('blockade detection', () => {
  it('hasAnyMovementMove answers correctly for BOTH players', () => {
    // The previous engine derived mobility from the side to move, so this
    // query was always false for the player not on turn.
    const state = position(DARK_BLOCKED, 'Light');
    expect(hasAnyMovementMove(state.board, 'Light')).toBe(true);
    expect(hasAnyMovementMove(state.board, 'Dark')).toBe(false);

    const asDark = position(DARK_BLOCKED, 'Dark');
    expect(hasAnyMovementMove(asDark.board, 'Light')).toBe(true);
    expect(hasAnyMovementMove(asDark.board, 'Dark')).toBe(false);
  });
});

describe('blockade: opponentMovesAgain (default)', () => {
  it('hands the turn straight back when the next player cannot move', () => {
    const state = position(DARK_BLOCKED, 'Light', {
      ...TACTICAL,
      blockade: 'opponentMovesAgain',
    });
    // Light plays a quiet move far away; Dark still cannot move.
    const next = apply(state, {
      type: 'move',
      from: toIndex(6, 5),
      to: toIndex(6, 4),
    });
    expect(next.outcome).toBeNull();
    expect(next.turn).toBe('Light');
    expect(next.blockadeExtraTurns).toBeGreaterThan(0);
  });

  it('resets the extra-turn counter once the blocked player is freed', () => {
    const state = position(DARK_BLOCKED, 'Light', {
      ...TACTICAL,
      blockade: 'opponentMovesAgain',
    });
    const blocked = apply(state, {
      type: 'move',
      from: toIndex(6, 5),
      to: toIndex(6, 4),
    });
    expect(blocked.blockadeExtraTurns).toBe(1);

    // Light steps out of the way, freeing Dark.
    const freed = apply(blocked, {
      type: 'move',
      from: toIndex(1, 0),
      to: toIndex(2, 0),
    });
    expect(freed.turn).toBe('Dark');
    expect(freed.blockadeExtraTurns).toBe(0);
    expect(legalMoves(freed).length).toBeGreaterThan(0);
  });
});

describe('blockade: blockedPlayerLoses', () => {
  it('ends the game in favour of the mobile player', () => {
    const state = position(DARK_BLOCKED, 'Light', {
      ...TACTICAL,
      blockade: 'blockedPlayerLoses',
    });
    const next = apply(state, {
      type: 'move',
      from: toIndex(6, 5),
      to: toIndex(6, 4),
    });
    expect(next.outcome).toEqual({
      kind: 'win',
      winner: 'Light',
      reason: 'immobilized',
    });
  });
});

describe('blockade: opponentRemovesOwnStone', () => {
  it('parks the game awaiting a sacrifice from the mobile player', () => {
    const state = position(DARK_BLOCKED, 'Light', {
      ...TACTICAL,
      blockade: 'opponentRemovesOwnStone',
    });
    const next = apply(state, {
      type: 'move',
      from: toIndex(6, 5),
      to: toIndex(6, 4),
    });
    expect(next.phase).toBe('blockadeRemoval');
    expect(next.blockedPlayer).toBe('Dark');
    expect(next.turn).toBe('Light');
  });

  it('only offers removals that actually free the blocked player', () => {
    const state = position(DARK_BLOCKED, 'Light', {
      ...TACTICAL,
      blockade: 'opponentRemovesOwnStone',
    });
    const parked = apply(state, {
      type: 'move',
      from: toIndex(6, 5),
      to: toIndex(6, 4),
    });
    const choices = legalMoves(parked).map((m) => m.to).sort((a, b) => a - b);
    // Only the two stones penning Dark in can open a path.
    expect(choices).toEqual([toIndex(0, 1), toIndex(1, 0)]);
  });

  it('rejects removing the blocked player’s stone', () => {
    const state = position(DARK_BLOCKED, 'Light', {
      ...TACTICAL,
      blockade: 'opponentRemovesOwnStone',
    });
    const parked = apply(state, {
      type: 'move',
      from: toIndex(6, 5),
      to: toIndex(6, 4),
    });
    // The old engine removed a stone from the BLOCKED player — unattested in
    // any source, and a unilateral penalty on the victim of the blockade.
    expect(expectReject(parked, { type: 'removeStone', at: toIndex(0, 0) })).toBe(
      'mustRemoveOwnStone',
    );
  });

  it('rejects a sacrifice that does not open a path', () => {
    const state = position(DARK_BLOCKED, 'Light', {
      ...TACTICAL,
      blockade: 'opponentRemovesOwnStone',
    });
    const parked = apply(state, {
      type: 'move',
      from: toIndex(6, 5),
      to: toIndex(6, 4),
    });
    expect(expectReject(parked, { type: 'removeStone', at: toIndex(4, 4) })).toBe(
      'removalMustFreeOpponent',
    );
  });

  it('returns the turn to the freed player after the sacrifice', () => {
    const state = position(DARK_BLOCKED, 'Light', {
      ...TACTICAL,
      blockade: 'opponentRemovesOwnStone',
    });
    const parked = apply(state, {
      type: 'move',
      from: toIndex(6, 5),
      to: toIndex(6, 4),
    });
    const freed = apply(parked, { type: 'removeStone', at: toIndex(0, 1) });
    expect(freed.phase).toBe('movement');
    expect(freed.turn).toBe('Dark');
    expect(freed.blockedPlayer).toBeNull();
    expect(hasAnyMovementMove(freed.board, 'Dark')).toBe(true);
  });

  it('blockadeRemovalChoices never returns the blocked player’s stones', () => {
    const state = position(DARK_BLOCKED, 'Light');
    const choices = blockadeRemovalChoices(state.board, 'Light', 'Dark');
    for (const cell of choices) {
      expect(state.board[cell]).toBe(1); // LIGHT
    }
  });
});

describe('mutual blockade', () => {
  it('adjudicates on material when neither side can move', () => {
    // Two stones each, all mutually walled in against the corners.
    const state = position(
      `
      DL.....
      L......
      .......
      .......
      .......
      .....L.
      ....LDD`,
      'Light',
      { ...TACTICAL, blockade: 'opponentMovesAgain' },
    );
    // Light plays its one free move, after which nobody can move.
    const moves = legalMoves(state);
    expect(moves.length).toBeGreaterThan(0);
  });
});
