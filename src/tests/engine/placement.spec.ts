// FILE: src/tests/engine/placement.spec.ts

import { describe, expect, it } from 'vitest';
import {
  CENTER,
  EMPTY,
  STONES_PER_PLAYER,
  applyAction,
  createGame,
  legalMoves,
  placementTargets,
  stoneCount,
  type GameState,
} from '../../engine';
import { apply, expectReject } from './helpers';

/** Plays out the whole placement phase, filling cells in ascending order. */
function playPlacement(variant?: Parameters<typeof createGame>[0]): GameState {
  let state = createGame(variant);
  let guard = 0;
  while (state.phase === 'placement') {
    if (guard++ > 200) throw new Error('placement did not terminate');
    const target = placementTargets(state.board)[0];
    state = apply(state, { type: 'place', at: target });
  }
  return state;
}

describe('placement phase', () => {
  it('starts with 24 stones each and Light to place', () => {
    const state = createGame();
    expect(state.inHand.Light).toBe(STONES_PER_PLAYER);
    expect(state.inHand.Dark).toBe(STONES_PER_PLAYER);
    expect(state.turn).toBe('Light');
    expect(state.placementsLeftThisTurn).toBe(2);
  });

  it('alternates after exactly two stones', () => {
    let state = createGame();
    state = apply(state, { type: 'place', at: 0 });
    expect(state.turn).toBe('Light');
    expect(state.placementsLeftThisTurn).toBe(1);

    state = apply(state, { type: 'place', at: 1 });
    expect(state.turn).toBe('Dark');
    expect(state.placementsLeftThisTurn).toBe(2);
    expect(state.inHand.Light).toBe(STONES_PER_PLAYER - 2);
    expect(state.inHand.Dark).toBe(STONES_PER_PLAYER);
  });

  it('refuses the centre during placement', () => {
    const state = createGame();
    expect(expectReject(state, { type: 'place', at: CENTER })).toBe('centerReserved');
  });

  it('refuses an occupied cell', () => {
    let state = createGame();
    state = apply(state, { type: 'place', at: 5 });
    expect(expectReject(state, { type: 'place', at: 5 })).toBe('cellOccupied');
  });

  it('refuses out-of-bounds cells', () => {
    const state = createGame();
    expect(expectReject(state, { type: 'place', at: -1 })).toBe('outOfBounds');
    expect(expectReject(state, { type: 'place', at: 49 })).toBe('outOfBounds');
  });

  it('refuses movement actions while placing', () => {
    const state = createGame();
    expect(expectReject(state, { type: 'move', from: 0, to: 1 })).toBe('wrongPhase');
  });

  it('never lets a stone count go negative and places exactly 48 stones', () => {
    const state = playPlacement();
    expect(state.inHand.Light).toBe(0);
    expect(state.inHand.Dark).toBe(0);
    expect(stoneCount(state.board, 'Light')).toBe(STONES_PER_PLAYER);
    expect(stoneCount(state.board, 'Dark')).toBe(STONES_PER_PLAYER);
  });

  it('leaves the centre as the only empty cell, so the opening move is forced there', () => {
    const state = playPlacement();
    expect(state.phase).toBe('movement');
    expect(state.board[CENTER]).toBe(EMPTY);

    let empties = 0;
    for (let i = 0; i < state.board.length; i++) {
      if (state.board[i] === EMPTY) empties++;
    }
    expect(empties).toBe(1);

    // Every legal opening move must therefore land on the centre.
    const moves = legalMoves(state);
    expect(moves.length).toBeGreaterThan(0);
    for (const move of moves) expect(move.to).toBe(CENTER);
  });

  it('gives the first move to the first placer by default', () => {
    const state = playPlacement();
    expect(state.turn).toBe('Light');
  });

  it('gives the first move to the second placer under that variant', () => {
    const state = playPlacement({ firstMover: 'secondPlacer' });
    expect(state.turn).toBe('Dark');
  });

  it('emits a stonePlaced event for each placement', () => {
    const state = createGame();
    const result = applyAction(state, { type: 'place', at: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toContainEqual({ type: 'stonePlaced', at: 3, player: 'Light' });
  });

  it('does not mutate the state it was given', () => {
    const state = createGame();
    const before = state.board.slice();
    apply(state, { type: 'place', at: 10 });
    expect(Array.from(state.board)).toEqual(Array.from(before));
    expect(state.inHand.Light).toBe(STONES_PER_PLAYER);
  });
});
