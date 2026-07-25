// FILE: src/ai/evaluate.ts
//
// Static evaluation for Seejeh, from the perspective of a given player.
//
// A structural fact drives much of this: a custodian capture needs enemy stones
// on BOTH sides of a victim along one axis. At the board edge one side is
// off-board, so an edge stone can only be taken along the axis parallel to the
// edge — and a CORNER stone can never be captured at all. `VULNERABLE_AXES`
// encodes that directly.

import {
  CELL_COUNT,
  CENTER,
  EMPTY,
  NEIGHBOURS,
  SIZE,
  colOf,
  hasAnyMovementMove,
  movementMoves,
  opponentOf,
  rowOf,
  step,
  type Board,
  type GameState,
  type Player,
  type VariantFlags,
} from '../engine';
import { cellValueOf } from '../engine';

/** Number of axes along which a stone on this cell could ever be sandwiched. */
export const VULNERABLE_AXES: Int8Array = (() => {
  const table = new Int8Array(CELL_COUNT);
  for (let i = 0; i < CELL_COUNT; i++) {
    let axes = 0;
    // Horizontal axis is live only when both left and right are on-board.
    if (step(i, 2) >= 0 && step(i, 3) >= 0) axes++;
    // Vertical axis likewise.
    if (step(i, 0) >= 0 && step(i, 1) >= 0) axes++;
    table[i] = axes;
  }
  return table;
})();

/** Chebyshev-ish centrality, 0 at the centre up to 3 at the corners. */
export const CENTRALITY: Int8Array = (() => {
  const mid = (SIZE - 1) / 2;
  const table = new Int8Array(CELL_COUNT);
  for (let i = 0; i < CELL_COUNT; i++) {
    table[i] = Math.max(Math.abs(rowOf(i) - mid), Math.abs(colOf(i) - mid));
  }
  return table;
})();

/** Cells orthogonally adjacent to the centre — the opening battleground. */
export const CENTER_ADJACENT: readonly number[] = NEIGHBOURS[CENTER];

export interface EvalWeights {
  material: number;
  mobility: number;
  centre: number;
  centreAdjacent: number;
  exposure: number;
  threat: number;
  protection: number;
}

export const DEFAULT_WEIGHTS: EvalWeights = {
  material: 100,
  mobility: 3,
  centre: 22,
  centreAdjacent: 5,
  exposure: 9,
  threat: 34,
  protection: 4,
};

export const WIN_SCORE = 1_000_000;

/**
 * Largest number of stones `player` could capture with a single move. This is
 * the tactical term the previous evaluator lacked entirely, which is why it
 * routinely left stones en prise.
 */
function bestImmediateCapture(
  board: Board,
  player: Player,
  variant: VariantFlags,
): number {
  let best = 0;
  for (const move of movementMoves(board, player, variant)) {
    if (move.captures.length > best) best = move.captures.length;
  }
  return best;
}

function mobilityOf(board: Board, player: Player, variant: VariantFlags): number {
  return movementMoves(board, player, variant).length;
}

/** Friendly orthogonal neighbours, which shield a stone along that axis. */
function protectionScore(board: Board, player: Player): number {
  const me = cellValueOf(player);
  let score = 0;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (board[i] !== me) continue;
    for (const n of NEIGHBOURS[i]) {
      if (board[n] === me) score++;
    }
  }
  return score / 2; // each pair counted twice
}

/** Sum of (2 - vulnerableAxes) over a player's stones: corners score highest. */
function exposureScore(board: Board, player: Player): number {
  const me = cellValueOf(player);
  let score = 0;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (board[i] === me) score += 2 - VULNERABLE_AXES[i];
  }
  return score;
}

function centreScore(board: Board, player: Player, variant: VariantFlags): number {
  const me = cellValueOf(player);
  let score = 0;
  if (board[CENTER] === me) score += variant.centerIsSafe ? 1 : 0.45;
  return score;
}

function centreAdjacentCount(board: Board, player: Player): number {
  const me = cellValueOf(player);
  let n = 0;
  for (const cell of CENTER_ADJACENT) if (board[cell] === me) n++;
  return n;
}

export function countOf(board: Board, player: Player): number {
  const me = cellValueOf(player);
  let n = 0;
  for (let i = 0; i < CELL_COUNT; i++) if (board[i] === me) n++;
  return n;
}

/**
 * Static evaluation in centistones, positive = good for `perspective`.
 * Terminal positions are handled by the search, not here.
 */
export function evaluate(
  state: GameState,
  perspective: Player,
  weights: EvalWeights = DEFAULT_WEIGHTS,
): number {
  const board = state.board;
  const foe = opponentOf(perspective);
  const variant = state.variant;

  const myCount = countOf(board, perspective);
  const foeCount = countOf(board, foe);

  let score = (myCount - foeCount) * weights.material;

  score += (mobilityOf(board, perspective, variant) - mobilityOf(board, foe, variant)) *
    weights.mobility;

  score += (centreScore(board, perspective, variant) - centreScore(board, foe, variant)) *
    weights.centre;

  score += (centreAdjacentCount(board, perspective) - centreAdjacentCount(board, foe)) *
    weights.centreAdjacent;

  score += (exposureScore(board, perspective) - exposureScore(board, foe)) *
    weights.exposure;

  score += (protectionScore(board, perspective) - protectionScore(board, foe)) *
    weights.protection;

  // Whoever is to move gets to realise their threat first, so only the side to
  // move is credited with its best capture; the other side is debited for what
  // it is exposing.
  const myThreat = bestImmediateCapture(board, perspective, variant);
  const foeThreat = bestImmediateCapture(board, foe, variant);
  if (state.turn === perspective) {
    score += myThreat * weights.threat;
    score -= foeThreat * weights.threat * 0.6;
  } else {
    score -= foeThreat * weights.threat;
    score += myThreat * weights.threat * 0.6;
  }

  // A player who cannot move is in serious trouble under every blockade rule.
  if (!hasAnyMovementMove(board, perspective)) score -= 60;
  if (!hasAnyMovementMove(board, foe)) score += 60;

  return score;
}

/**
 * Heuristic value of dropping a stone on `cell` during placement, where full
 * search is useless (branching is ~47 wide and the horizon is 24 turns away).
 *
 * Placement is really about three things: owning squares next to the centre so
 * you have an opening move, clustering so your stones shield each other, and
 * preferring structurally safe squares.
 */
export function scorePlacement(
  board: Board,
  cell: number,
  player: Player,
  variant: VariantFlags,
): number {
  const me = cellValueOf(player);
  const foe = cellValueOf(opponentOf(player));
  let score = 0;

  // Owning squares next to the centre decides who opens the game.
  if (CENTER_ADJACENT.includes(cell)) score += 42;

  // Corners cannot be captured; edges only along one axis.
  score += (2 - VULNERABLE_AXES[cell]) * 11;

  // Cluster with friends: a friendly neighbour permanently shields that axis.
  let friends = 0;
  let foes = 0;
  for (const n of NEIGHBOURS[cell]) {
    if (board[n] === me) friends++;
    else if (board[n] === foe) foes++;
  }
  score += friends * 9;

  // Sitting next to an enemy with the opposite side still empty is how stones
  // get taken once the board opens up.
  for (let axis = 0; axis < 2; axis++) {
    const a = step(cell, axis === 0 ? 2 : 0);
    const b = step(cell, axis === 0 ? 3 : 1);
    if (a < 0 || b < 0) continue;
    const aFoe = board[a] === foe;
    const bFoe = board[b] === foe;
    const aEmpty = board[a] === EMPTY;
    const bEmpty = board[b] === EMPTY;
    if ((aFoe && bEmpty) || (bFoe && aEmpty)) score -= 14;
  }

  // Mild pull toward the middle for mobility, without overriding safety.
  score += (3 - CENTRALITY[cell]) * 2;

  // Contesting the enemy's cluster is worth a little.
  score += foes * 2;

  if (variant.centerIsSafe) score += 0; // placeholder: centre itself is barred

  return score;
}
