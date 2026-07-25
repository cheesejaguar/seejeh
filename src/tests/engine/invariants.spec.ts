// FILE: src/tests/engine/invariants.spec.ts
//
// Property-based tests: play thousands of complete random games and assert the
// engine's design invariants hold at every single ply. These are the tests that
// catch the whole CLASS of bug the previous engine shipped, rather than one
// instance of it.

import { describe, expect, it } from 'vitest';
import {
  CELL_COUNT,
  CENTER,
  EMPTY,
  STONES_PER_PLAYER,
  applyAction,
  createGame,
  hasAnyMovementMove,
  legalMoves,
  stoneCount,
  type GameState,
  type Player,
  type VariantFlags,
} from '../../engine';
import { makeRng } from './helpers';

interface Playout {
  finalState: GameState;
  plies: number;
}

/**
 * Plays one complete random game, asserting invariants after every action.
 * Throws with a descriptive message the moment an invariant is violated.
 */
function randomPlayout(seed: number, variant?: Partial<VariantFlags>): Playout {
  const rng = makeRng(seed);
  let state = createGame(variant);
  let plies = 0;
  const maxPlies = 4000;

  const describeAt = (msg: string) =>
    `${msg} (seed=${seed}, ply=${plies}, phase=${state.phase}, turn=${state.turn})`;

  while (!state.outcome) {
    if (++plies > maxPlies) {
      throw new Error(describeAt('game failed to terminate'));
    }

    const moves = legalMoves(state);

    // INVARIANT: a game that is not over always offers the side to move at
    // least one legal action. If not, the engine has deadlocked.
    if (moves.length === 0) {
      throw new Error(describeAt('no legal actions but game is not over'));
    }

    const chosen = moves[Math.floor(rng() * moves.length) % moves.length];
    const action =
      state.phase === 'placement'
        ? ({ type: 'place', at: chosen.to } as const)
        : state.phase === 'blockadeRemoval'
          ? ({ type: 'removeStone', at: chosen.to } as const)
          : ({ type: 'move', from: chosen.from, to: chosen.to } as const);

    const before = state;
    const result = applyAction(state, action);

    // INVARIANT: every move reported as legal must be accepted.
    if (!result.ok) {
      throw new Error(
        describeAt(
          `legal action ${JSON.stringify(action)} was rejected: ${result.rejection.code}`,
        ),
      );
    }

    // INVARIANT: actions never mutate the state they were given.
    if (before.board === result.state.board) {
      throw new Error(describeAt('action returned an aliased board'));
    }

    state = result.state;
    assertStateInvariants(state, describeAt);
  }

  return { finalState: state, plies };
}

function assertStateInvariants(
  state: GameState,
  describeAt: (msg: string) => string,
): void {
  const light = stoneCount(state.board, 'Light');
  const dark = stoneCount(state.board, 'Dark');

  // INVARIANT: stones are conserved — nothing is created out of nothing.
  // Board stones plus stones still in hand can only ever decrease.
  if (light + state.inHand.Light > STONES_PER_PLAYER) {
    throw new Error(describeAt(`Light gained stones: ${light}+${state.inHand.Light}`));
  }
  if (dark + state.inHand.Dark > STONES_PER_PLAYER) {
    throw new Error(describeAt(`Dark gained stones: ${dark}+${state.inHand.Dark}`));
  }

  // INVARIANT: stone counts never go negative.
  if (state.inHand.Light < 0 || state.inHand.Dark < 0) {
    throw new Error(describeAt('negative stones in hand'));
  }

  // INVARIANT: the centre is empty for the whole placement phase.
  if (state.phase === 'placement' && state.board[CENTER] !== EMPTY) {
    throw new Error(describeAt('a stone was placed on the centre'));
  }

  // INVARIANT: board cells only ever hold known values.
  for (let i = 0; i < CELL_COUNT; i++) {
    if (state.board[i] > 2) throw new Error(describeAt(`corrupt cell ${i}`));
  }

  // INVARIANT: a chain always points at a real stone belonging to the mover.
  if (state.phase === 'chain') {
    const expected = state.turn === 'Light' ? 1 : 2;
    if (state.chainFrom < 0 || state.board[state.chainFrom] !== expected) {
      throw new Error(describeAt('chainFrom does not hold the mover’s stone'));
    }
  } else if (state.phase !== 'gameOver' && state.chainFrom !== -1) {
    throw new Error(describeAt('stale chainFrom outside the chain phase'));
  }

  // INVARIANT: if the game is still running, the side to move can act.
  if (!state.outcome && state.phase === 'movement') {
    if (!hasAnyMovementMove(state.board, state.turn)) {
      throw new Error(describeAt('side to move is immobile but game continues'));
    }
  }

  // INVARIANT: blockadeRemoval always names the blocked player.
  if (state.phase === 'blockadeRemoval' && !state.blockedPlayer) {
    throw new Error(describeAt('blockadeRemoval without a blocked player'));
  }

  // INVARIANT: a finished game reports the gameOver phase, and vice versa.
  if (state.outcome && state.phase !== 'gameOver') {
    throw new Error(describeAt('outcome set but phase is not gameOver'));
  }
  if (!state.outcome && state.phase === 'gameOver') {
    throw new Error(describeAt('gameOver phase with no outcome'));
  }
}

const VARIANTS: Array<[string, Partial<VariantFlags> | undefined]> = [
  ['default', undefined],
  ['no centre safety', { centerIsSafe: false }],
  ['no chains', { chainCaptures: false }],
  ['mandatory chains', { chainMustContinue: true }],
  ['strict elimination', { loneStoneLoses: false }],
  ['blockade: sacrifice a stone', { blockade: 'opponentRemovesOwnStone' }],
  ['blockade: blocked player loses', { blockade: 'blockedPlayerLoses' }],
  ['second placer opens', { firstMover: 'secondPlacer' }],
];

describe('engine invariants under random play', () => {
  for (const [name, variant] of VARIANTS) {
    it(`holds across 60 complete games — ${name}`, () => {
      for (let seed = 1; seed <= 60; seed++) {
        const { finalState } = randomPlayout(seed * 7919, variant);
        expect(finalState.outcome).not.toBeNull();
      }
    });
  }

  it('always terminates, and reaches the movement phase', () => {
    let reachedMovement = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const { finalState, plies } = randomPlayout(seed * 104729);
      expect(plies).toBeLessThan(4000);
      if (finalState.history.some((h) => h.kind === 'move')) reachedMovement++;
    }
    expect(reachedMovement).toBe(40);
  });

  it('the first movement-phase ply is always forced into the centre', () => {
    // A structural consequence of 48 stones on 49 cells. If this ever fails,
    // the placement phase is broken.
    for (let seed = 1; seed <= 25; seed++) {
      const rng = makeRng(seed * 31337);
      let state = createGame();
      while (state.phase === 'placement') {
        const moves = legalMoves(state);
        const chosen = moves[Math.floor(rng() * moves.length) % moves.length];
        const result = applyAction(state, { type: 'place', at: chosen.to });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        state = result.state;
      }
      const opening = legalMoves(state);
      expect(opening.length).toBeGreaterThan(0);
      for (const move of opening) expect(move.to).toBe(CENTER);
    }
  });

  it('turn alternates except for chains and blockade extra turns', () => {
    const rng = makeRng(20260725);
    let state = createGame();
    let previous: Player | null = null;

    while (!state.outcome) {
      const moves = legalMoves(state);
      if (moves.length === 0) break;
      const chosen = moves[Math.floor(rng() * moves.length) % moves.length];
      const wasChain = state.phase === 'chain';
      const hadBlockade = state.blockedPlayer !== null;
      const mover = state.turn;

      const action =
        state.phase === 'placement'
          ? ({ type: 'place', at: chosen.to } as const)
          : state.phase === 'blockadeRemoval'
            ? ({ type: 'removeStone', at: chosen.to } as const)
            : ({ type: 'move', from: chosen.from, to: chosen.to } as const);

      const result = applyAction(state, action);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      state = result.state;

      // The mover may retain the turn only for a legitimate reason.
      if (!state.outcome && state.turn === mover && previous === mover) {
        const legitimate =
          wasChain ||
          state.phase === 'chain' ||
          hadBlockade ||
          state.blockedPlayer !== null ||
          state.phase === 'placement' ||
          state.phase === 'blockadeRemoval';
        expect(legitimate).toBe(true);
      }
      previous = mover;
    }
  });
});
