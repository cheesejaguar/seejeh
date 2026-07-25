// FILE: src/tests/engine/helpers.ts

import {
  applyAction,
  boardFromDiagram,
  createGame,
  toIndex,
  type Action,
  type GameState,
  type Player,
  type VariantFlags,
} from '../../engine';

/**
 * Variant used by tactical tests: disables every "game ends early" rule so a
 * hand-built position with few stones does not terminate before the behaviour
 * under test can run.
 */
export const TACTICAL: Partial<VariantFlags> = {
  loneStoneLoses: false,
  noProgressLimit: 0,
  repetitionDraw: false,
  blockade: 'opponentMovesAgain',
};

/** Builds a movement-phase position from a 7x7 ASCII diagram. */
export function position(
  diagram: string,
  turn: Player,
  variant: Partial<VariantFlags> = TACTICAL,
): GameState {
  const base = createGame({ ...TACTICAL, ...variant });
  return {
    ...base,
    board: boardFromDiagram(diagram),
    phase: 'movement',
    turn,
    inHand: { Light: 0, Dark: 0 },
    placementsLeftThisTurn: 0,
  };
}

export const at = toIndex;

/** Applies an action, failing the test with the rejection code if illegal. */
export function apply(state: GameState, action: Action): GameState {
  const result = applyAction(state, action);
  if (!result.ok) {
    throw new Error(
      `Expected ${JSON.stringify(action)} to be legal, got: ${result.rejection.code}`,
    );
  }
  return result.state;
}

/** Applies an action expecting rejection, returning the rejection code. */
export function expectReject(state: GameState, action: Action): string {
  const result = applyAction(state, action);
  if (result.ok) {
    throw new Error(`Expected ${JSON.stringify(action)} to be rejected, but it succeeded`);
  }
  return result.rejection.code;
}

export function capturedBy(state: GameState, action: Action): number[] {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(`Illegal: ${result.rejection.code}`);
  for (const event of result.events) {
    if (event.type === 'stonesCaptured') return [...event.cells];
  }
  return [];
}

/** Deterministic PRNG (mulberry32) so property tests reproduce exactly. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}
