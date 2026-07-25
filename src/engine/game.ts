// FILE: src/engine/game.ts
//
// The Seejeh state machine.
//
// Every rule lives here and nowhere else. The previous implementation let the
// UI store reimplement placement, which drifted from the engine and produced
// negative stone counts; the single `applyAction` entry point makes that class
// of bug structurally impossible.
//
// `applyAction` is total: it never throws for game reasons, returning a
// machine-readable `Rejection` code instead so the UI can translate it.

import {
  CENTER,
  EMPTY,
  PLACEMENTS_PER_TURN,
  STONES_PER_PLAYER,
  areAdjacent,
  boardToString,
  cloneBoard,
  createBoard,
  inBounds,
  type Board,
} from './board';
import {
  blockadeRemovalChoices,
  capturesAt,
  cellValueOf,
  chainMoves,
  hasAnyMovementMove,
  legalMoves,
  opponentOf,
  stoneCount,
} from './rules';
import type {
  Action,
  ActionResult,
  GameEvent,
  GameState,
  MoveRecord,
  Outcome,
  Phase,
  Player,
  Rejection,
  RejectionCode,
  VariantFlags,
} from './types';
import { normalizeVariant } from './variants';

type Draft = {
  -readonly [K in keyof GameState]: GameState[K];
};

function reject(code: RejectionCode, params?: Record<string, string | number>): ActionResult {
  const rejection: Rejection = params ? { code, params } : { code };
  return { ok: false, rejection };
}

export function createGame(variant?: Partial<VariantFlags> | null): GameState {
  return {
    board: createBoard(),
    phase: 'placement',
    turn: 'Light',
    inHand: { Light: STONES_PER_PLAYER, Dark: STONES_PER_PLAYER },
    placementsLeftThisTurn: PLACEMENTS_PER_TURN,
    chainFrom: -1,
    blockedPlayer: null,
    blockadeExtraTurns: 0,
    variant: normalizeVariant(variant),
    outcome: null,
    ply: 0,
    quietPlies: 0,
    positionCounts: {},
    history: [],
    drawOffer: null,
  };
}

function toDraft(state: GameState): Draft {
  return {
    board: cloneBoard(state.board),
    phase: state.phase,
    turn: state.turn,
    inHand: { ...state.inHand },
    placementsLeftThisTurn: state.placementsLeftThisTurn,
    chainFrom: state.chainFrom,
    blockedPlayer: state.blockedPlayer,
    blockadeExtraTurns: state.blockadeExtraTurns,
    variant: state.variant,
    outcome: state.outcome,
    ply: state.ply,
    quietPlies: state.quietPlies,
    positionCounts: state.positionCounts,
    history: state.history,
    drawOffer: state.drawOffer,
  };
}

function positionKey(d: Draft): string {
  return `${boardToString(d.board)}|${d.turn}|${d.phase}`;
}

function setPhase(d: Draft, next: Phase, events: GameEvent[]): void {
  if (d.phase === next) return;
  events.push({ type: 'phaseChanged', from: d.phase, to: next });
  d.phase = next;
}

function endGame(d: Draft, outcome: Outcome, events: GameEvent[]): void {
  d.outcome = outcome;
  d.chainFrom = -1;
  d.blockedPlayer = null;
  setPhase(d, 'gameOver', events);
  events.push({ type: 'gameEnded', outcome });
}

function decideOnMaterial(
  d: Draft,
  drawReason: 'noProgress' | 'mutualBlockade',
  events: GameEvent[],
): void {
  const light = stoneCount(d.board, 'Light');
  const dark = stoneCount(d.board, 'Dark');
  if (light > dark) {
    endGame(d, { kind: 'win', winner: 'Light', reason: 'material' }, events);
  } else if (dark > light) {
    endGame(d, { kind: 'win', winner: 'Dark', reason: 'material' }, events);
  } else {
    endGame(d, { kind: 'draw', reason: drawReason }, events);
  }
}

/**
 * Elimination and lone-stone checks. `mover` is the player who just acted; ties
 * are resolved in their favour because they are the one who just captured.
 */
function checkMaterialOutcome(d: Draft, mover: Player, events: GameEvent[]): boolean {
  if (d.outcome) return true;
  const foe = opponentOf(mover);
  const foeCount = stoneCount(d.board, foe);
  const moverCount = stoneCount(d.board, mover);

  if (foeCount === 0) {
    endGame(d, { kind: 'win', winner: mover, reason: 'elimination' }, events);
    return true;
  }
  if (moverCount === 0) {
    endGame(d, { kind: 'win', winner: foe, reason: 'elimination' }, events);
    return true;
  }
  if (d.variant.loneStoneLoses) {
    if (foeCount === 1) {
      endGame(d, { kind: 'win', winner: mover, reason: 'loneStone' }, events);
      return true;
    }
    if (moverCount === 1) {
      endGame(d, { kind: 'win', winner: foe, reason: 'loneStone' }, events);
      return true;
    }
  }
  return false;
}

/**
 * Applies the blockade rule for the side to move. Returns having either left
 * the turn with a mobile player, ended the game, or parked the game in
 * `blockadeRemoval` awaiting a stone sacrifice.
 */
function resolveBlockade(d: Draft, events: GameEvent[]): void {
  if (d.outcome) return;
  if (hasAnyMovementMove(d.board, d.turn)) {
    // The side to move is mobile, so no obligation is outstanding.
    d.blockadeExtraTurns = 0;
    d.blockedPlayer = null;
    return;
  }

  const blocked = d.turn;
  const opponent = opponentOf(blocked);

  // Neither side can move: the position is dead, decide on material.
  if (!hasAnyMovementMove(d.board, opponent)) {
    decideOnMaterial(d, 'mutualBlockade', events);
    return;
  }

  switch (d.variant.blockade) {
    case 'blockedPlayerLoses':
      events.push({ type: 'blockade', blocked, resolution: 'blockedPlayerLoses' });
      endGame(d, { kind: 'win', winner: opponent, reason: 'immobilized' }, events);
      return;

    case 'opponentRemovesOwnStone': {
      const choices = blockadeRemovalChoices(d.board, opponent, blocked);
      if (choices.length === 0) {
        // No sacrifice can open a path; the blockade is total.
        events.push({ type: 'blockade', blocked, resolution: 'opponentRemovesOwnStone' });
        endGame(d, { kind: 'win', winner: opponent, reason: 'immobilized' }, events);
        return;
      }
      d.blockedPlayer = blocked;
      d.turn = opponent;
      setPhase(d, 'blockadeRemoval', events);
      events.push({ type: 'blockade', blocked, resolution: 'opponentRemovesOwnStone' });
      events.push({ type: 'turnChanged', to: d.turn });
      return;
    }

    case 'opponentMovesAgain':
    default:
      // The opponent takes an extra turn, but `blockedPlayer` stays set so that
      // move generation restricts them to moves which actually open a path.
      // Without that restriction the mover, who profits from the blockade,
      // could shuffle indefinitely. The no-progress rule is the backstop for
      // positions where no opening move exists at all.
      d.blockedPlayer = blocked;
      d.turn = opponent;
      d.blockadeExtraTurns += 1;
      events.push({ type: 'blockade', blocked, resolution: 'opponentMovesAgain' });
      events.push({ type: 'turnChanged', to: d.turn });
      return;
  }
}

function recordPosition(d: Draft, events: GameEvent[]): void {
  if (d.outcome) return;
  const key = positionKey(d);
  const count = (d.positionCounts[key] ?? 0) + 1;
  d.positionCounts = { ...d.positionCounts, [key]: count };

  if (d.variant.repetitionDraw && count >= 3) {
    endGame(d, { kind: 'draw', reason: 'repetition' }, events);
    return;
  }
  if (d.variant.noProgressLimit > 0 && d.quietPlies >= d.variant.noProgressLimit) {
    decideOnMaterial(d, 'noProgress', events);
  }
}

/** Hands the turn to the opponent and settles blockade / draw conditions. */
function concludeTurn(d: Draft, events: GameEvent[]): void {
  if (d.outcome) return;
  if (d.phase === 'chain') {
    events.push({ type: 'chainEnded' });
    setPhase(d, 'movement', events);
  }
  d.chainFrom = -1;
  d.turn = opponentOf(d.turn);
  events.push({ type: 'turnChanged', to: d.turn });

  resolveBlockade(d, events);
  recordPosition(d, events);
}

function pushHistory(d: Draft, record: MoveRecord): void {
  d.history = [...d.history, record];
  d.ply += 1;
  // A draw offer stands only until play continues. Left open it would survive
  // any number of plies — and a save/reload — letting a player accept an offer
  // made thirty moves earlier.
  d.drawOffer = null;
}

function finish(d: Draft, events: GameEvent[]): ActionResult {
  return { ok: true, state: d as GameState, events };
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

function doPlace(state: GameState, at: number): ActionResult {
  if (state.phase !== 'placement') return reject('wrongPhase');
  if (!inBounds(at)) return reject('outOfBounds');
  if (at === CENTER) return reject('centerReserved');
  if (state.board[at] !== EMPTY) return reject('cellOccupied');
  if (state.inHand[state.turn] <= 0) return reject('noStonesInHand');

  const d = toDraft(state);
  const events: GameEvent[] = [];
  const player = d.turn;

  d.board[at] = cellValueOf(player);
  d.inHand = { ...d.inHand, [player]: d.inHand[player] - 1 };
  d.placementsLeftThisTurn -= 1;
  events.push({ type: 'stonePlaced', at, player });
  pushHistory(d, { ply: d.ply, player, kind: 'place', from: -1, to: at, captured: [] });

  const turnComplete = d.placementsLeftThisTurn <= 0 || d.inHand[player] <= 0;
  if (!turnComplete) return finish(d, events);

  if (d.inHand.Light <= 0 && d.inHand.Dark <= 0) {
    // Placement is over. 48 stones sit on 49 cells, so the centre is the only
    // empty square and the opening move is forced into it — or, if no stone of
    // the side to move borders the centre, that side is immediately blockaded.
    setPhase(d, 'movement', events);
    d.placementsLeftThisTurn = 0;
    d.turn = d.variant.firstMover === 'secondPlacer' ? 'Dark' : 'Light';
    d.quietPlies = 0;
    d.positionCounts = {};
    events.push({ type: 'turnChanged', to: d.turn });
    resolveBlockade(d, events);
    recordPosition(d, events);
    return finish(d, events);
  }

  const next = opponentOf(player);
  d.turn = next;
  d.placementsLeftThisTurn = Math.min(PLACEMENTS_PER_TURN, d.inHand[next]);
  events.push({ type: 'turnChanged', to: next });
  return finish(d, events);
}

function doMove(state: GameState, from: number, to: number): ActionResult {
  if (state.phase !== 'movement' && state.phase !== 'chain') return reject('wrongPhase');
  if (!inBounds(from) || !inBounds(to)) return reject('outOfBounds');

  const player = state.turn;
  if (state.board[from] !== cellValueOf(player)) return reject('notYourStone');
  if (!areAdjacent(from, to)) return reject('notAdjacent');
  if (state.board[to] !== EMPTY) return reject('destinationOccupied');

  if (state.phase === 'chain' && from !== state.chainFrom) {
    return reject('mustMoveChainStone');
  }

  // "Must open a path": when the opponent is blockaded and this is an extra
  // turn, only moves that free them are legal — provided at least one exists.
  if (
    state.blockedPlayer &&
    state.blockedPlayer !== player &&
    state.variant.blockade === 'opponentMovesAgain'
  ) {
    const allowed = legalMoves(state);
    if (
      allowed.length > 0 &&
      !allowed.some((move) => move.from === from && move.to === to)
    ) {
      return reject('mustOpenPath');
    }
  }

  const d = toDraft(state);
  const events: GameEvent[] = [];

  d.board[from] = EMPTY;
  d.board[to] = cellValueOf(player);
  const captured = capturesAt(d.board, to, player, d.variant.centerIsSafe);

  // In a chain, every continuation must itself capture. Rejecting here — rather
  // than silently allowing it — closes the loophole that granted a free second
  // move whenever a player entered chain mode and then moved harmlessly.
  if (state.phase === 'chain' && captured.length === 0) {
    return reject('chainMoveMustCapture');
  }

  for (const cell of captured) d.board[cell] = EMPTY;

  events.push({ type: 'stoneMoved', from, to, player });
  if (captured.length > 0) {
    events.push({ type: 'stonesCaptured', cells: captured, by: player });
  }
  pushHistory(d, { ply: d.ply, player, kind: 'move', from, to, captured });

  if (captured.length > 0) {
    // Captures are irreversible, so no earlier position can recur.
    d.quietPlies = 0;
    d.positionCounts = {};
  } else {
    d.quietPlies += 1;
  }

  if (checkMaterialOutcome(d, player, events)) return finish(d, events);

  if (
    captured.length > 0 &&
    d.variant.chainCaptures &&
    chainMoves(d.board, to, player, d.variant).length > 0
  ) {
    setPhase(d, 'chain', events);
    d.chainFrom = to;
    events.push({ type: 'chainStarted', at: to });
    return finish(d, events);
  }

  concludeTurn(d, events);
  return finish(d, events);
}

function doEndChain(state: GameState): ActionResult {
  if (state.phase !== 'chain') return reject('notInChain');
  if (state.variant.chainMustContinue) return reject('chainIsMandatory');

  const d = toDraft(state);
  const events: GameEvent[] = [];
  pushHistory(d, {
    ply: d.ply,
    player: d.turn,
    kind: 'endChain',
    from: d.chainFrom,
    to: -1,
    captured: [],
  });
  concludeTurn(d, events);
  return finish(d, events);
}

function doRemoveStone(state: GameState, at: number): ActionResult {
  if (state.phase !== 'blockadeRemoval') return reject('wrongPhase');
  if (!inBounds(at)) return reject('outOfBounds');

  const remover = state.turn;
  const blocked = state.blockedPlayer ?? opponentOf(remover);
  if (state.board[at] !== cellValueOf(remover)) return reject('mustRemoveOwnStone');

  const probe = cloneBoard(state.board);
  probe[at] = EMPTY;
  if (!hasAnyMovementMove(probe, blocked)) return reject('removalMustFreeOpponent');

  const d = toDraft(state);
  const events: GameEvent[] = [];

  d.board[at] = EMPTY;
  events.push({ type: 'stoneRemoved', at, player: remover });
  pushHistory(d, {
    ply: d.ply,
    player: remover,
    kind: 'removeStone',
    from: at,
    to: -1,
    captured: [],
  });

  d.blockedPlayer = null;
  d.blockadeExtraTurns = 0;
  setPhase(d, 'movement', events);

  // The sacrifice can itself drop the remover to a losing stone count.
  if (checkMaterialOutcome(d, blocked, events)) return finish(d, events);

  d.turn = blocked;
  events.push({ type: 'turnChanged', to: blocked });
  d.quietPlies += 1;
  resolveBlockade(d, events);
  recordPosition(d, events);
  return finish(d, events);
}

function doResign(state: GameState, player: Player): ActionResult {
  const d = toDraft(state);
  const events: GameEvent[] = [];
  endGame(d, { kind: 'win', winner: opponentOf(player), reason: 'resignation' }, events);
  return finish(d, events);
}

function doOfferDraw(state: GameState, player: Player): ActionResult {
  const d = toDraft(state);
  const events: GameEvent[] = [];
  d.drawOffer = player;
  events.push({ type: 'drawOffered', by: player });
  return finish(d, events);
}

function doAcceptDraw(state: GameState, player: Player): ActionResult {
  if (!state.drawOffer || state.drawOffer === player) return reject('noDrawOffer');
  const d = toDraft(state);
  const events: GameEvent[] = [];
  d.drawOffer = null;
  endGame(d, { kind: 'draw', reason: 'agreement' }, events);
  return finish(d, events);
}

function doDeclineDraw(state: GameState, player: Player): ActionResult {
  if (!state.drawOffer || state.drawOffer === player) return reject('noDrawOffer');
  const d = toDraft(state);
  const events: GameEvent[] = [];
  d.drawOffer = null;
  events.push({ type: 'drawDeclined', by: player });
  return finish(d, events);
}

// ---------------------------------------------------------------------------

export function applyAction(state: GameState, action: Action): ActionResult {
  if (state.outcome && action.type !== 'resign') return reject('gameOver');

  switch (action.type) {
    case 'place':
      return doPlace(state, action.at);
    case 'move':
      return doMove(state, action.from, action.to);
    case 'endChain':
      return doEndChain(state);
    case 'removeStone':
      return doRemoveStone(state, action.at);
    case 'resign':
      if (state.outcome) return reject('gameOver');
      return doResign(state, action.player);
    case 'offerDraw':
      return doOfferDraw(state, action.player);
    case 'acceptDraw':
      return doAcceptDraw(state, action.player);
    case 'declineDraw':
      return doDeclineDraw(state, action.player);
    default:
      return reject('wrongPhase');
  }
}

/** Convenience wrapper that throws — for tests and known-legal AI moves. */
export function applyOrThrow(state: GameState, action: Action): GameState {
  const result = applyAction(state, action);
  if (!result.ok) {
    throw new Error(
      `Illegal action ${JSON.stringify(action)}: ${result.rejection.code}`,
    );
  }
  return result.state;
}

export function stonesOnBoard(state: GameState, player: Player): number {
  return stoneCount(state.board, player);
}

/** Total stones a player still controls, including those yet to be placed. */
export function totalStones(state: GameState, player: Player): number {
  return stoneCount(state.board, player) + state.inHand[player];
}

export function isGameOver(state: GameState): boolean {
  return state.outcome !== null;
}

export type { Board };
