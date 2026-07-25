// FILE: src/tests/ai/search.spec.ts

import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  legalMoves,
  stoneCount,
  toIndex,
  type GameState,
  type Player,
} from '../../engine';
import { findBestMove, type AIMove, type Difficulty } from '../../ai/search';
import { position } from '../engine/helpers';

function actionFor(move: AIMove) {
  switch (move.kind) {
    case 'place':
      return { type: 'place', at: move.at } as const;
    case 'move':
      return { type: 'move', from: move.from, to: move.to } as const;
    case 'removeStone':
      return { type: 'removeStone', at: move.at } as const;
    case 'endChain':
      return { type: 'endChain' } as const;
  }
}

/** Plays a complete AI-vs-AI game, asserting every produced move is legal. */
function playGame(
  light: Difficulty,
  dark: Difficulty,
  seed: number,
  budgetMs = 25,
): GameState {
  let state = createGame();
  let plies = 0;

  while (!state.outcome && plies < 3000) {
    const difficulty = state.turn === 'Light' ? light : dark;
    const result = findBestMove(state, {
      difficulty,
      seed: seed + plies,
      timeBudgetMs: budgetMs,
    });

    expect(result.move, `no move at ply ${plies} (phase ${state.phase})`).not.toBeNull();
    if (!result.move) break;

    const applied = applyAction(state, actionFor(result.move));
    expect(
      applied.ok,
      `AI produced an illegal move at ply ${plies}: ${JSON.stringify(result.move)} ` +
        `in phase ${state.phase}` +
        (applied.ok ? '' : ` -> ${applied.rejection.code}`),
    ).toBe(true);
    if (!applied.ok) break;

    state = applied.state;
    plies++;
  }

  return state;
}

describe('AI legality', () => {
  it('never produces an illegal move across complete games', () => {
    for (const seed of [1, 2, 3]) {
      const final = playGame('medium', 'easy', seed * 1000);
      expect(final.outcome).not.toBeNull();
    }
  }, 120_000);

  it('returns a move in every non-terminal phase', () => {
    let state = createGame();
    // Placement
    let result = findBestMove(state, { difficulty: 'medium', timeBudgetMs: 40 });
    expect(result.move?.kind).toBe('place');

    // Drive to the movement phase.
    let guard = 0;
    while (state.phase === 'placement' && guard++ < 100) {
      const moves = legalMoves(state);
      const applied = applyAction(state, { type: 'place', at: moves[0].to });
      if (!applied.ok) break;
      state = applied.state;
    }
    expect(state.phase).toBe('movement');

    result = findBestMove(state, { difficulty: 'medium', timeBudgetMs: 40 });
    expect(result.move?.kind).toBe('move');
  }, 30_000);
});

describe('AI tactics', () => {
  it('takes an available capture', () => {
    // Light can play (0,1)->(1,1) capturing Dark(1,2). Nothing else captures.
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
      { loneStoneLoses: false, noProgressLimit: 0, repetitionDraw: false },
    );
    const result = findBestMove(state, { difficulty: 'hard', timeBudgetMs: 400 });
    expect(result.move).toEqual({
      kind: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
  }, 20_000);

  it('does not walk into a capture when a safe move exists', () => {
    // Dark(2,2) and Dark(2,4) form a trap: Light moving to (2,3) is safe
    // (self-move immunity), but Light moving (1,4)->(1,3) would let Dark
    // capture. Verify the AI keeps material.
    const state = position(
      `
      .......
      ...L...
      ..D.D..
      .......
      .......
      L......
      ......D`,
      'Light',
      { loneStoneLoses: false, noProgressLimit: 0, repetitionDraw: false },
    );
    const before = stoneCount(state.board, 'Light');
    const result = findBestMove(state, { difficulty: 'hard', timeBudgetMs: 500 });
    expect(result.move).not.toBeNull();
    if (!result.move) return;

    const applied = applyAction(state, actionFor(result.move));
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;

    // Let Dark reply with its best move and check Light did not simply hang one.
    const reply = findBestMove(applied.state, {
      difficulty: 'hard',
      timeBudgetMs: 500,
    });
    if (reply.move) {
      const after = applyAction(applied.state, actionFor(reply.move));
      if (after.ok) {
        expect(stoneCount(after.state.board, 'Light')).toBe(before);
      }
    }
  }, 30_000);

  it('prefers a forced win over a slower line', () => {
    // Light to move can capture Dark's last stone immediately.
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
      { loneStoneLoses: false, noProgressLimit: 0, repetitionDraw: false },
    );
    const result = findBestMove(state, { difficulty: 'hard', timeBudgetMs: 400 });
    const applied = applyAction(state, actionFor(result.move!));
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.outcome).toEqual({
      kind: 'win',
      winner: 'Light',
      reason: 'elimination',
    });
  }, 20_000);
});

describe('AI determinism and budget', () => {
  it('is deterministic for a given seed', () => {
    const state = position(
      `
      .L.L...
      ..DL...
      .......
      ...L...
      .....D.
      .......
      ......D`,
      'Light',
      { loneStoneLoses: false, noProgressLimit: 0, repetitionDraw: false },
    );
    const a = findBestMove(state, { difficulty: 'easy', seed: 42, timeBudgetMs: 200 });
    const b = findBestMove(state, { difficulty: 'easy', seed: 42, timeBudgetMs: 200 });
    expect(a.move).toEqual(b.move);
  }, 20_000);

  it('respects its time budget', () => {
    let state = createGame();
    let guard = 0;
    while (state.phase === 'placement' && guard++ < 100) {
      const moves = legalMoves(state);
      const applied = applyAction(state, { type: 'place', at: moves[0].to });
      if (!applied.ok) break;
      state = applied.state;
    }
    const result = findBestMove(state, { difficulty: 'hard', timeBudgetMs: 300 });
    // Generous slack for a slow CI machine, but must not run away.
    expect(result.elapsedMs).toBeLessThan(3000);
  }, 20_000);

  it('searches deeper on higher difficulties', () => {
    let state = createGame();
    let guard = 0;
    while (state.phase === 'placement' && guard++ < 100) {
      const moves = legalMoves(state);
      const applied = applyAction(state, { type: 'place', at: moves[0].to });
      if (!applied.ok) break;
      state = applied.state;
    }
    const weak = findBestMove(state, { difficulty: 'beginner', timeBudgetMs: 500 });
    const strong = findBestMove(state, { difficulty: 'hard', timeBudgetMs: 900 });
    expect(strong.depth).toBeGreaterThan(weak.depth);
  }, 30_000);
});

describe('AI strength ladder', () => {
  it('hard beats beginner over a deterministic mini-match', () => {
    let hardWins = 0;
    let beginnerWins = 0;

    const matches: Array<[Player, number]> = [
      ['Light', 11],
      ['Dark', 22],
      ['Light', 33],
    ];

    for (const [hardSide, seed] of matches) {
      const final =
        hardSide === 'Light'
          ? playGame('hard', 'beginner', seed, 60)
          : playGame('beginner', 'hard', seed, 60);

      if (final.outcome?.kind === 'win') {
        if (final.outcome.winner === hardSide) hardWins++;
        else beginnerWins++;
      }
    }

    expect(
      hardWins,
      `hard=${hardWins} beginner=${beginnerWins} across ${matches.length} games`,
    ).toBeGreaterThan(beginnerWins);
  }, 300_000);
});
