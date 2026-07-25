// FILE: src/tests/engine/serialize.spec.ts

import { describe, expect, it } from 'vitest';
import {
  applyOrThrow,
  boardToString,
  createGame,
  deserializeGame,
  legalMoves,
  serializeGame,
} from '../../engine';

function midGame() {
  let state = createGame();
  let guard = 0;
  while (state.phase === 'placement' && guard++ < 100) {
    const moves = legalMoves(state);
    state = applyOrThrow(state, { type: 'place', at: moves[0].to });
  }
  const opening = legalMoves(state);
  return applyOrThrow(state, {
    type: 'move',
    from: opening[0].from,
    to: opening[0].to,
  });
}

describe('serialization', () => {
  it('round-trips a game exactly', () => {
    const original = midGame();
    const restored = deserializeGame(serializeGame(original));

    expect(restored).not.toBeNull();
    if (!restored) return;
    expect(boardToString(restored.board)).toBe(boardToString(original.board));
    expect(restored.phase).toBe(original.phase);
    expect(restored.turn).toBe(original.turn);
    expect(restored.inHand).toEqual(original.inHand);
    expect(restored.variant).toEqual(original.variant);
    expect(restored.ply).toBe(original.ply);
    expect(restored.history.length).toBe(original.history.length);
  });

  it('a restored game continues to play identically', () => {
    const original = midGame();
    const restored = deserializeGame(serializeGame(original));
    expect(restored).not.toBeNull();
    if (!restored) return;

    const a = legalMoves(original).map((m) => `${m.from}->${m.to}`).sort();
    const b = legalMoves(restored).map((m) => `${m.from}->${m.to}`).sort();
    expect(b).toEqual(a);
  });

  it('returns null rather than throwing on garbage', () => {
    // The previous implementation JSON.parsed blindly and crashed on boot.
    expect(deserializeGame('not json at all')).toBeNull();
    expect(deserializeGame('')).toBeNull();
    expect(deserializeGame(null)).toBeNull();
    expect(deserializeGame(undefined)).toBeNull();
    expect(deserializeGame('[]')).toBeNull();
    expect(deserializeGame('null')).toBeNull();
    expect(deserializeGame('42')).toBeNull();
    expect(deserializeGame('{}')).toBeNull();
  });

  it('rejects a payload from a different save version', () => {
    const payload = JSON.parse(serializeGame(createGame()));
    payload.v = 999;
    expect(deserializeGame(JSON.stringify(payload))).toBeNull();
  });

  it('rejects a malformed board', () => {
    const payload = JSON.parse(serializeGame(createGame()));
    payload.board = 'LLL';
    expect(deserializeGame(JSON.stringify(payload))).toBeNull();

    const payload2 = JSON.parse(serializeGame(createGame()));
    payload2.board = 'X'.repeat(49);
    expect(deserializeGame(JSON.stringify(payload2))).toBeNull();
  });

  it('rejects an unknown phase or player', () => {
    const payload = JSON.parse(serializeGame(createGame()));
    payload.phase = 'teleporting';
    expect(deserializeGame(JSON.stringify(payload))).toBeNull();

    const payload2 = JSON.parse(serializeGame(createGame()));
    payload2.turn = 'Purple';
    expect(deserializeGame(JSON.stringify(payload2))).toBeNull();
  });

  it('rejects a structurally impossible chain state', () => {
    const payload = JSON.parse(serializeGame(createGame()));
    payload.phase = 'chain';
    payload.chainFrom = -1;
    expect(deserializeGame(JSON.stringify(payload))).toBeNull();
  });

  it('discards an invalid outcome instead of trusting it', () => {
    const payload = JSON.parse(serializeGame(createGame()));
    payload.outcome = { kind: 'win', winner: 'Light', reason: 'bribery' };
    const restored = deserializeGame(JSON.stringify(payload));
    expect(restored?.outcome).toBeNull();
  });

  it('clamps out-of-range numbers rather than propagating them', () => {
    const payload = JSON.parse(serializeGame(createGame()));
    payload.inHand = { Light: -5, Dark: 9999 };
    payload.placementsLeftThisTurn = 77;
    const restored = deserializeGame(JSON.stringify(payload));
    expect(restored).not.toBeNull();
    expect(restored?.inHand.Light).toBe(0);
    expect(restored?.inHand.Dark).toBe(64);
    expect(restored?.placementsLeftThisTurn).toBe(2);
  });

  it('backfills missing variant fields with defaults', () => {
    const payload = JSON.parse(serializeGame(createGame()));
    delete payload.variant;
    const restored = deserializeGame(JSON.stringify(payload));
    expect(restored).not.toBeNull();
    expect(restored?.variant.centerIsSafe).toBe(true);
    expect(restored?.variant.blockade).toBe('opponentMovesAgain');
  });
});
