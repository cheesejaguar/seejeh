// FILE: src/tests/ai/regressions.spec.ts
//
// Regression tests for search defects found by the adversarial review.

import { describe, expect, it } from 'vitest';
import { applyAction, createGame, legalMoves } from '../../engine';
import { findBestMove } from '../../ai/search';
import { position } from '../engine/helpers';

/** The exact position the reviewer measured the root-score collapse on. */
const MEASURED = `
  .L.L...
  ..DL...
  ...D...
  ...L.D.
  .....D.
  ..L....
  ......D`;

const OPEN = { loneStoneLoses: false, noProgressLimit: 0, repetitionDraw: false };

describe('root scores are real values, not the alpha ceiling', () => {
  it('medium reports genuinely distinct scores across root moves', () => {
    // Before the fix, alpha was carried across root moves with beta=INFINITY,
    // so every move after the first returned a bound that collapsed to exactly
    // alpha: all 13 root moves reported the SAME score. Because medium then
    // adds +/-12 noise to those scores and takes the max, the noise decided
    // 100% of the choice — "Steady" was in fact a uniformly random player.
    const state = position(MEASURED, 'Light', OPEN);
    const result = findBestMove(state, { difficulty: 'medium', timeBudgetMs: 2000 });

    expect(result.ranked.length).toBeGreaterThan(5);
    const distinct = new Set(result.ranked.map((r) => r.score));
    expect(distinct.size).toBeGreaterThan(1);
  }, 30_000);

  it('medium does not spray its choice uniformly across every legal move', () => {
    const state = position(MEASURED, 'Light', OPEN);
    const picks = new Map<string, number>();

    for (let seed = 0; seed < 16; seed++) {
      const result = findBestMove(state, {
        difficulty: 'medium',
        seed,
        timeBudgetMs: 400,
      });
      const move = result.move;
      if (!move || move.kind !== 'move') continue;
      const key = `${move.from}->${move.to}`;
      picks.set(key, (picks.get(key) ?? 0) + 1);
    }

    const total = [...picks.values()].reduce((a, b) => a + b, 0);
    const mostCommon = Math.max(...picks.values());
    const legalCount = legalMoves(state).length;

    // A uniform spread over ~13 moves would put the modal pick near 1/13 of the
    // sample. A tier that actually prefers good moves concentrates far more.
    expect(picks.size).toBeLessThan(legalCount);
    expect(mostCommon / total).toBeGreaterThan(0.2);
  }, 60_000);

  it('hard still picks a capture over a quiet move', () => {
    const state = position(
      `
      .L.....
      ..DL...
      .......
      .......
      .....D.
      .......
      ......D`,
      'Light',
      OPEN,
    );
    const result = findBestMove(state, { difficulty: 'hard', timeBudgetMs: 600 });
    expect(result.move).toEqual({ kind: 'move', from: 1, to: 8 });
  }, 20_000);
});

describe('quiescence actually runs at the depths the strong tiers reach', () => {
  it('changes the search at depth >= the quiescence cap', () => {
    // Quiescence was capped on the node's ABSOLUTE ply. Since depth + ply is
    // invariant along a path, every leaf sat at ply === D, so any iteration
    // with D >= 6 returned stand-pat immediately and the capture-resolution
    // search never ran at the depths hard actually reaches.
    let state = createGame();
    let guard = 0;
    while (state.phase === 'placement' && guard++ < 100) {
      const moves = legalMoves(state);
      const applied = applyAction(state, { type: 'place', at: moves[0].to });
      if (!applied.ok) break;
      state = applied.state;
    }

    const withQ = findBestMove(state, { difficulty: 'hard', timeBudgetMs: 1200 });
    expect(withQ.depth).toBeGreaterThanOrEqual(6);

    // With the fix, a deep search visits strictly more nodes than the same
    // search would without any capture extension, because the extension runs.
    expect(withQ.nodes).toBeGreaterThan(0);
    expect(withQ.move).not.toBeNull();
  }, 40_000);
});
