// FILE: src/tests/engine/regressions.spec.ts
//
// Regression tests for defects found by the adversarial review of the rewrite.
// Each one failed before its fix.

import { describe, expect, it } from 'vitest';
import { applyOrThrow, createGame, legalMoves, toIndex } from '../../engine';
import {
  emptyData,
  exportLeaderboard,
  importLeaderboard,
  ratedGames,
  recordGame,
  upsertProfile,
  computeStats,
  type RecordGameInput,
} from '../../leaderboard/store';
import { STARTING_RATING } from '../../leaderboard/rating';
import { apply, expectReject, position } from './helpers';

describe('a draw offer lapses once play continues', () => {
  it('is cleared by the next move, so it cannot be accepted much later', () => {
    // Previously the offer persisted indefinitely — across any number of plies
    // and even across save/reload — so a player could accept an offer made
    // thirty moves earlier.
    let state = createGame();
    state = apply(state, { type: 'offerDraw', player: 'Light' });
    expect(state.drawOffer).toBe('Light');

    state = apply(state, { type: 'place', at: 0 });
    expect(state.drawOffer).toBeNull();

    expect(expectReject(state, { type: 'acceptDraw', player: 'Dark' })).toBe('noDrawOffer');
  });

  it('can still be answered immediately', () => {
    let state = createGame();
    state = apply(state, { type: 'offerDraw', player: 'Light' });
    state = apply(state, { type: 'acceptDraw', player: 'Dark' });
    expect(state.outcome).toEqual({ kind: 'draw', reason: 'agreement' });
  });

  it('is cleared by a movement-phase move too', () => {
    let state = position(
      `
      .L.....
      .......
      .......
      .......
      .......
      .......
      ......D`,
      'Light',
    );
    state = apply(state, { type: 'offerDraw', player: 'Light' });
    expect(state.drawOffer).toBe('Light');
    state = apply(state, { type: 'move', from: toIndex(0, 1), to: toIndex(0, 2) });
    expect(state.drawOffer).toBeNull();
  });
});

describe('rating chain is derived, never trusted from stored order', () => {
  const profile = {
    id: 'p1',
    name: 'A',
    source: 'local' as const,
    createdAt: 0,
  };

  function game(overrides: Partial<RecordGameInput> = {}): RecordGameInput {
    return {
      profileId: 'p1',
      playedAt: 1,
      durationMs: 1000,
      result: 'win',
      reason: 'elimination',
      playerColor: 'Light',
      difficulty: 'medium',
      stonesOwn: 10,
      stonesOpponent: 0,
      captures: 5,
      losses: 1,
      bestCapture: 2,
      moves: 20,
      ...overrides,
    };
  }

  it('stays continuous when a game arrives out of chronological order', () => {
    let data = upsertProfile(emptyData(), profile);
    data = recordGame(data, game({ id: 'later', playedAt: 100, result: 'win' })).data;
    // A record with an EARLIER timestamp lands after it.
    data = recordGame(data, game({ id: 'earlier', playedAt: 50, result: 'loss' })).data;

    const chain = ratedGames(data, 'p1');
    expect(chain[0].ratingBefore).toBe(STARTING_RATING);
    // Every link must join up: each game starts where the previous one ended.
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].ratingBefore).toBe(chain[i - 1].ratingAfter);
    }
    expect(computeStats(data, 'p1').rating).toBe(chain.at(-1)?.ratingAfter);
  });

  it('stays continuous after importing another device’s history', () => {
    let mine = upsertProfile(emptyData(), profile);
    for (let i = 0; i < 3; i++) {
      mine = recordGame(mine, game({ id: `mine${i}`, playedAt: 100 + i, result: 'win' })).data;
    }

    let theirs = upsertProfile(emptyData(), profile);
    for (let i = 0; i < 3; i++) {
      theirs = recordGame(theirs, game({ id: `theirs${i}`, playedAt: 1 + i, result: 'loss' })).data;
    }

    const merged = importLeaderboard(mine, exportLeaderboard(theirs));
    expect(merged).not.toBeNull();
    if (!merged) return;

    const chain = ratedGames(merged, 'p1');
    expect(chain).toHaveLength(6);
    expect(chain[0].ratingBefore).toBe(STARTING_RATING);
    for (let i = 1; i < chain.length; i++) {
      // Previously the two independent 1200-based chains were interleaved,
      // leaving a visible discontinuity and losing the user's own results.
      expect(chain[i].ratingBefore).toBe(chain[i - 1].ratingAfter);
    }
    const stats = computeStats(merged, 'p1');
    expect(stats.games).toBe(6);
    expect(stats.wins).toBe(3);
    expect(stats.losses).toBe(3);
  });
});

describe('opening move is forced into the centre', () => {
  it('holds for a full placement playthrough', () => {
    let state = createGame();
    let guard = 0;
    while (state.phase === 'placement' && guard++ < 200) {
      const moves = legalMoves(state);
      state = applyOrThrow(state, { type: 'place', at: moves[0].to });
    }
    const opening = legalMoves(state);
    expect(opening.length).toBeGreaterThan(0);
    for (const move of opening) expect(move.to).toBe(24);
  });
});
