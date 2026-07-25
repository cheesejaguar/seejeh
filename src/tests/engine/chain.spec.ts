// FILE: src/tests/engine/chain.spec.ts

import { describe, expect, it } from 'vitest';
import { applyAction, legalMoves, toIndex } from '../../engine';
import { TACTICAL, apply, expectReject, position } from './helpers';

/**
 * Position where Light moving (0,1)->(1,1) captures Dark(1,2), and the same
 * stone can then continue (1,1)->(2,1) to capture Dark(3,1) against Light(4,1).
 *
 * The idle Dark stone at (6,6) exists so the chain does not end the game by
 * elimination before the behaviour under test can run.
 */
const CHAINABLE = `
  .L.....
  ..DL...
  .......
  .D.....
  .L.....
  .......
  ......D`;

describe('chain captures', () => {
  it('enters the chain phase with the capturing stone locked in', () => {
    const state = position(CHAINABLE, 'Light');
    const next = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    expect(next.phase).toBe('chain');
    expect(next.chainFrom).toBe(toIndex(1, 1));
    expect(next.turn).toBe('Light');
  });

  it('only enters the chain phase when a capturing continuation exists', () => {
    // Single capture available, nothing to follow up with.
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
    );
    const next = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    expect(next.phase).toBe('movement');
    expect(next.turn).toBe('Dark');
  });

  it('offers only capturing continuations during a chain', () => {
    const state = position(CHAINABLE, 'Light');
    const chaining = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    const moves = legalMoves(chaining);
    expect(moves.length).toBeGreaterThan(0);
    for (const move of moves) {
      expect(move.from).toBe(chaining.chainFrom);
      expect(move.captures.length).toBeGreaterThan(0);
    }
  });

  it('rejects a non-capturing chain step instead of granting a free move', () => {
    const state = position(CHAINABLE, 'Light');
    const chaining = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    // (1,1)->(1,0) is a legal step geometrically but captures nothing.
    expect(
      expectReject(chaining, { type: 'move', from: toIndex(1, 1), to: toIndex(1, 0) }),
    ).toBe('chainMoveMustCapture');
  });

  it('rejects moving a different stone during a chain', () => {
    const state = position(CHAINABLE, 'Light');
    const chaining = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    expect(
      expectReject(chaining, { type: 'move', from: toIndex(4, 1), to: toIndex(5, 1) }),
    ).toBe('mustMoveChainStone');
  });

  it('lets the player decline the chain by default, passing the turn', () => {
    const state = position(CHAINABLE, 'Light');
    const chaining = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    const ended = apply(chaining, { type: 'endChain' });
    expect(ended.phase).toBe('movement');
    expect(ended.turn).toBe('Dark');
    expect(ended.chainFrom).toBe(-1);
  });

  it('forbids declining when chains are mandatory', () => {
    const state = position(CHAINABLE, 'Light', {
      ...TACTICAL,
      chainMustContinue: true,
    });
    const chaining = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    expect(chaining.phase).toBe('chain');
    expect(expectReject(chaining, { type: 'endChain' })).toBe('chainIsMandatory');
  });

  it('never enters a chain when chain captures are disabled', () => {
    const state = position(CHAINABLE, 'Light', { ...TACTICAL, chainCaptures: false });
    const next = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    expect(next.phase).toBe('movement');
    expect(next.turn).toBe('Dark');
  });

  it('completes a two-capture chain and clears chain state', () => {
    const state = position(CHAINABLE, 'Light');
    const first = apply(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    const second = apply(first, {
      type: 'move',
      from: toIndex(1, 1),
      to: toIndex(2, 1),
    });
    expect(second.history.at(-1)?.captured).toEqual([toIndex(3, 1)]);
    expect(second.chainFrom).toBe(-1);
    expect(second.turn).toBe('Dark');
  });

  it('rejects endChain outside a chain', () => {
    const state = position(CHAINABLE, 'Light');
    expect(expectReject(state, { type: 'endChain' })).toBe('notInChain');
  });

  it('emits chainStarted and chainEnded events', () => {
    const state = position(CHAINABLE, 'Light');
    const started = applyAction(state, {
      type: 'move',
      from: toIndex(0, 1),
      to: toIndex(1, 1),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.events.some((e) => e.type === 'chainStarted')).toBe(true);

    const ended = applyAction(started.state, { type: 'endChain' });
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    expect(ended.events.some((e) => e.type === 'chainEnded')).toBe(true);
  });
});
