// FILE: src/engine/types.ts

import type { Board } from './board';

export type Player = 'Light' | 'Dark';

/**
 * Phases of a Seejeh game.
 *
 * `blockadeRemoval` only occurs under the `opponentRemovesOwnStone` blockade
 * variant, where the unblocked player must give up one of their own stones to
 * open a path (Lane, 1836).
 */
export type Phase =
  | 'placement'
  | 'movement'
  | 'chain'
  | 'blockadeRemoval'
  | 'gameOver';

export type BlockadeRule =
  | 'opponentMovesAgain'
  | 'opponentRemovesOwnStone'
  | 'blockedPlayerLoses';

export type FirstMoverRule = 'firstPlacer' | 'secondPlacer';

export interface VariantFlags {
  /** A stone standing on the centre cannot be captured (Bell-derived tradition). */
  readonly centerIsSafe: boolean;
  /** After a capture the same stone may move again if that move also captures. */
  readonly chainCaptures: boolean;
  /** When a capturing continuation exists, the player is obliged to take it. */
  readonly chainMustContinue: boolean;
  /** A player reduced to a single stone loses (they can never capture again). */
  readonly loneStoneLoses: boolean;
  /** How a player with no legal move is handled. */
  readonly blockade: BlockadeRule;
  /** Who takes the first move once placement ends. */
  readonly firstMover: FirstMoverRule;
  /** Consecutive non-capturing plies before the game is adjudicated. 0 disables. */
  readonly noProgressLimit: number;
  /** Threefold repetition ends the game in a draw. */
  readonly repetitionDraw: boolean;
}

export type WinReason =
  | 'elimination'
  | 'loneStone'
  | 'immobilized'
  | 'resignation'
  | 'material';

export type DrawReason =
  | 'agreement'
  | 'repetition'
  | 'noProgress'
  | 'mutualBlockade';

export type Outcome =
  | { readonly kind: 'win'; readonly winner: Player; readonly reason: WinReason }
  | { readonly kind: 'draw'; readonly reason: DrawReason };

export interface MoveRecord {
  readonly ply: number;
  readonly player: Player;
  readonly kind: 'place' | 'move' | 'removeStone' | 'endChain';
  readonly from: number; // -1 for placements
  readonly to: number; // -1 for removals
  readonly captured: readonly number[];
}

export interface GameState {
  readonly board: Board;
  readonly phase: Phase;
  /** The player who must act now. */
  readonly turn: Player;
  /** Stones still to be placed, per player. */
  readonly inHand: Readonly<Record<Player, number>>;
  /** Placements remaining in the current placement turn (2 -> 1 -> 0). */
  readonly placementsLeftThisTurn: number;
  /** Origin square of an in-progress capture chain, or -1. */
  readonly chainFrom: number;
  /** Player who is blockaded while `phase === 'blockadeRemoval'`. */
  readonly blockedPlayer: Player | null;
  /** Consecutive extra turns granted because the opponent is blockaded. */
  readonly blockadeExtraTurns: number;
  readonly variant: VariantFlags;
  readonly outcome: Outcome | null;
  /** Total actions applied since the start of the game. */
  readonly ply: number;
  /** Consecutive non-capturing movement plies, for the no-progress rule. */
  readonly quietPlies: number;
  /** Occurrence count per position key, for threefold repetition. */
  readonly positionCounts: Readonly<Record<string, number>>;
  readonly history: readonly MoveRecord[];
  /** Player who has an open draw offer, or null. */
  readonly drawOffer: Player | null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type Action =
  | { readonly type: 'place'; readonly at: number }
  | { readonly type: 'move'; readonly from: number; readonly to: number }
  | { readonly type: 'endChain' }
  | { readonly type: 'removeStone'; readonly at: number }
  | { readonly type: 'resign'; readonly player: Player }
  | { readonly type: 'offerDraw'; readonly player: Player }
  | { readonly type: 'acceptDraw'; readonly player: Player }
  | { readonly type: 'declineDraw'; readonly player: Player };

/**
 * Machine-readable rejection codes. These are i18n keys, never user-facing
 * prose — the previous implementation surfaced raw English `Error.message`
 * strings in the UI, which broke translation entirely.
 */
export type RejectionCode =
  | 'gameOver'
  | 'wrongPhase'
  | 'outOfBounds'
  | 'cellOccupied'
  | 'cellEmpty'
  | 'centerReserved'
  | 'noStonesInHand'
  | 'notYourStone'
  | 'notAdjacent'
  | 'destinationOccupied'
  | 'mustMoveChainStone'
  | 'chainMoveMustCapture'
  | 'chainIsMandatory'
  | 'notInChain'
  | 'mustRemoveOwnStone'
  | 'removalMustFreeOpponent'
  | 'mustOpenPath'
  | 'noDrawOffer'
  | 'notYourTurn';

export interface Rejection {
  readonly code: RejectionCode;
  /** Interpolation values for the corresponding translation string. */
  readonly params?: Readonly<Record<string, string | number>>;
}

// ---------------------------------------------------------------------------
// Events — the UI animates from these rather than diffing board states.
// ---------------------------------------------------------------------------

export type GameEvent =
  | { readonly type: 'stonePlaced'; readonly at: number; readonly player: Player }
  | {
      readonly type: 'stoneMoved';
      readonly from: number;
      readonly to: number;
      readonly player: Player;
    }
  | {
      readonly type: 'stonesCaptured';
      readonly cells: readonly number[];
      readonly by: Player;
    }
  | { readonly type: 'stoneRemoved'; readonly at: number; readonly player: Player }
  | { readonly type: 'chainStarted'; readonly at: number }
  | { readonly type: 'chainEnded' }
  | { readonly type: 'phaseChanged'; readonly from: Phase; readonly to: Phase }
  | { readonly type: 'turnChanged'; readonly to: Player }
  | {
      readonly type: 'blockade';
      readonly blocked: Player;
      readonly resolution: BlockadeRule;
    }
  | { readonly type: 'drawOffered'; readonly by: Player }
  | { readonly type: 'drawDeclined'; readonly by: Player }
  | { readonly type: 'gameEnded'; readonly outcome: Outcome };

export type ActionResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly rejection: Rejection };

/** A legal move in the movement or chain phase. */
export interface Move {
  readonly from: number;
  readonly to: number;
  readonly captures: readonly number[];
}
