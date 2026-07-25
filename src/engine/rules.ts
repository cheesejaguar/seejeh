// FILE: src/engine/rules.ts
//
// Legal move generation and custodian capture resolution.
//
// RULE NOTE (capture): traditional Seega captures EXACTLY ONE stone per
// direction — the enemy stone must be immediately adjacent to the destination
// and immediately backed by a friendly stone. Sweeping a whole contiguous line
// is the Hasami Shogi rule, not Seega's; the Ludii reference ruleset encodes
// the cap explicitly as ("CustodialCapture" Orthogonal (max 1)).
//
// Because a move can close a sandwich in each of the four directions
// independently, a single move captures at most 3 stones in practice (the
// direction the stone came from is necessarily empty).

import {
  CELL_COUNT,
  CENTER,
  EMPTY,
  type Board,
  type CellValue,
  cloneBoard,
  inBounds,
  step,
} from './board';
import type { GameState, Move, Player, VariantFlags } from './types';

export function opponentOf(player: Player): Player {
  return player === 'Light' ? 'Dark' : 'Light';
}

export function cellValueOf(player: Player): CellValue {
  return player === 'Light' ? 1 : 2;
}

export function playerAt(board: Board, index: number): Player | null {
  const v = board[index];
  return v === 1 ? 'Light' : v === 2 ? 'Dark' : null;
}

export function stoneCount(board: Board, player: Player): number {
  const target = cellValueOf(player);
  let n = 0;
  for (let i = 0; i < CELL_COUNT; i++) if (board[i] === target) n++;
  return n;
}

/**
 * Custodian captures produced by `mover`'s stone standing on `at`.
 *
 * `board` must ALREADY reflect the completed move (the stone sitting on `at`
 * and its origin square vacated), otherwise the backing-stone test can read a
 * stale occupant.
 */
export function capturesAt(
  board: Board,
  at: number,
  mover: Player,
  centerIsSafe: boolean,
): number[] {
  const me = cellValueOf(mover);
  const enemy = cellValueOf(opponentOf(mover));
  const captured: number[] = [];

  for (let d = 0; d < 4; d++) {
    const adj = step(at, d);
    if (adj < 0) continue;
    if (board[adj] !== enemy) continue;
    // A stone standing on the protected centre cannot be taken, though it may
    // itself act as the backing stone for a capture.
    if (centerIsSafe && adj === CENTER) continue;
    const beyond = step(adj, d);
    if (beyond < 0) continue;
    if (board[beyond] !== me) continue;
    captured.push(adj);
  }

  return captured;
}

/**
 * Captures that WOULD result from moving `from` -> `to`, without mutating
 * anything. Simulating the move matters: the origin square must be empty when
 * the backing-stone test runs.
 */
export function previewCaptures(
  board: Board,
  from: number,
  to: number,
  mover: Player,
  centerIsSafe: boolean,
): number[] {
  const sim = cloneBoard(board);
  sim[from] = EMPTY;
  sim[to] = cellValueOf(mover);
  return capturesAt(sim, to, mover, centerIsSafe);
}

/** True when `player` has at least one legal one-step move on this board. */
export function hasAnyMovementMove(board: Board, player: Player): boolean {
  const me = cellValueOf(player);
  for (let i = 0; i < CELL_COUNT; i++) {
    if (board[i] !== me) continue;
    for (let d = 0; d < 4; d++) {
      const n = step(i, d);
      if (n >= 0 && board[n] === EMPTY) return true;
    }
  }
  return false;
}

/**
 * All one-step moves available to `player`, with their captures.
 *
 * Takes the player explicitly rather than reading `state.turn`. The previous
 * engine derived it from the side to move, which silently made every
 * "can the opponent move?" query return false and broke blockade detection.
 */
export function movementMoves(
  board: Board,
  player: Player,
  variant: VariantFlags,
): Move[] {
  const me = cellValueOf(player);
  const moves: Move[] = [];
  for (let from = 0; from < CELL_COUNT; from++) {
    if (board[from] !== me) continue;
    for (let d = 0; d < 4; d++) {
      const to = step(from, d);
      if (to < 0 || board[to] !== EMPTY) continue;
      moves.push({
        from,
        to,
        captures: previewCaptures(board, from, to, player, variant.centerIsSafe),
      });
    }
  }
  return moves;
}

/** Capturing continuations available to the stone standing on `from`. */
export function chainMoves(
  board: Board,
  from: number,
  player: Player,
  variant: VariantFlags,
): Move[] {
  const moves: Move[] = [];
  if (!inBounds(from) || board[from] !== cellValueOf(player)) return moves;
  for (let d = 0; d < 4; d++) {
    const to = step(from, d);
    if (to < 0 || board[to] !== EMPTY) continue;
    const captures = previewCaptures(board, from, to, player, variant.centerIsSafe);
    if (captures.length > 0) moves.push({ from, to, captures });
  }
  return moves;
}

/** Empty, non-centre cells available during the placement phase. */
export function placementTargets(board: Board): number[] {
  const targets: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (i === CENTER) continue;
    if (board[i] === EMPTY) targets.push(i);
  }
  return targets;
}

/**
 * Own stones whose removal would give `blocked` a legal move. Used by the
 * `opponentRemovesOwnStone` blockade rule, where the unblocked player must
 * sacrifice a stone specifically to open a path.
 */
export function blockadeRemovalChoices(
  board: Board,
  remover: Player,
  blocked: Player,
): number[] {
  const mine = cellValueOf(remover);
  const choices: number[] = [];
  const sim = cloneBoard(board);
  for (let i = 0; i < CELL_COUNT; i++) {
    if (board[i] !== mine) continue;
    sim[i] = EMPTY;
    if (hasAnyMovementMove(sim, blocked)) choices.push(i);
    sim[i] = mine;
  }
  return choices;
}

/**
 * Filters `moves` down to those that leave `blocked` with a legal move.
 *
 * Uses make/unmake on one scratch board rather than cloning per candidate.
 */
export function movesThatUnblock(
  board: Board,
  moves: readonly Move[],
  mover: Player,
  blocked: Player,
): Move[] {
  const me = cellValueOf(mover);
  const scratch = cloneBoard(board);
  const out: Move[] = [];

  for (const move of moves) {
    scratch[move.from] = EMPTY;
    scratch[move.to] = me;
    for (const cell of move.captures) scratch[cell] = EMPTY;

    if (hasAnyMovementMove(scratch, blocked)) out.push(move);

    scratch[move.from] = board[move.from];
    scratch[move.to] = board[move.to];
    for (const cell of move.captures) scratch[cell] = board[cell];
  }

  return out;
}

/**
 * The "must open a path" obligation. When the opponent is blockaded under the
 * `opponentMovesAgain` rule, the mover's extra turn is restricted to moves that
 * actually free them — otherwise the mover, who profits from the blockade,
 * could simply shuffle forever.
 *
 * If no move can free them, the mover plays unrestricted and keeps trying.
 */
export function applyUnblockRestriction(state: GameState, moves: Move[]): Move[] {
  const blocked = state.blockedPlayer;
  if (!blocked || blocked === state.turn) return moves;
  if (state.variant.blockade !== 'opponentMovesAgain') return moves;
  const freeing = movesThatUnblock(state.board, moves, state.turn, blocked);
  return freeing.length > 0 ? freeing : moves;
}

/**
 * Every action currently available to the side to move, as moves. Placement
 * targets are returned as `{from: -1, to: cell}`.
 */
export function legalMoves(state: GameState): Move[] {
  if (state.outcome) return [];
  switch (state.phase) {
    case 'placement':
      if (state.inHand[state.turn] <= 0) return [];
      return placementTargets(state.board).map((to) => ({
        from: -1,
        to,
        captures: [] as number[],
      }));
    case 'movement':
      return applyUnblockRestriction(
        state,
        movementMoves(state.board, state.turn, state.variant),
      );
    case 'chain':
      return applyUnblockRestriction(
        state,
        chainMoves(state.board, state.chainFrom, state.turn, state.variant),
      );
    case 'blockadeRemoval':
      return blockadeRemovalChoices(
        state.board,
        state.turn,
        state.blockedPlayer ?? opponentOf(state.turn),
      ).map((to) => ({ from: -1, to, captures: [] as number[] }));
    default:
      return [];
  }
}

/**
 * Legal destinations for the stone on `from`, for board highlighting. Honours
 * the unblock restriction so the UI never highlights a move the engine would
 * reject.
 */
export function movesFrom(state: GameState, from: number): Move[] {
  return legalMoves(state).filter((move) => move.from === from);
}
