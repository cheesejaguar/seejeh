// FILE: src/engine/serialize.ts
//
// Versioned, validated persistence.
//
// The previous implementation did a bare `JSON.parse` with no version tag and
// no validation, so any stale or hand-edited payload crashed the app during
// boot. Here, anything that fails validation returns null and the caller starts
// a fresh game.

import { CELL_COUNT, boardFromString, boardToString } from './board';
import type {
  DrawReason,
  GameState,
  MoveRecord,
  Outcome,
  Phase,
  Player,
  VariantFlags,
  WinReason,
} from './types';
import { normalizeVariant } from './variants';

export const SAVE_VERSION = 1;

const PHASES: readonly Phase[] = [
  'placement',
  'movement',
  'chain',
  'blockadeRemoval',
  'gameOver',
];

interface SavedGame {
  v: number;
  board: string;
  phase: Phase;
  turn: Player;
  inHand: { Light: number; Dark: number };
  placementsLeftThisTurn: number;
  chainFrom: number;
  blockedPlayer: Player | null;
  blockadeExtraTurns: number;
  variant: VariantFlags;
  outcome: Outcome | null;
  ply: number;
  quietPlies: number;
  positionCounts: Record<string, number>;
  history: MoveRecord[];
  drawOffer: Player | null;
}

export function serializeGame(state: GameState): string {
  const payload: SavedGame = {
    v: SAVE_VERSION,
    board: boardToString(state.board),
    phase: state.phase,
    turn: state.turn,
    inHand: { Light: state.inHand.Light, Dark: state.inHand.Dark },
    placementsLeftThisTurn: state.placementsLeftThisTurn,
    chainFrom: state.chainFrom,
    blockedPlayer: state.blockedPlayer,
    blockadeExtraTurns: state.blockadeExtraTurns,
    variant: state.variant,
    outcome: state.outcome,
    ply: state.ply,
    quietPlies: state.quietPlies,
    positionCounts: { ...state.positionCounts },
    history: [...state.history],
    drawOffer: state.drawOffer,
  };
  return JSON.stringify(payload);
}

function isPlayer(value: unknown): value is Player {
  return value === 'Light' || value === 'Dark';
}

function asInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

const WIN_REASONS: readonly WinReason[] = [
  'elimination',
  'loneStone',
  'immobilized',
  'resignation',
  'material',
];

const DRAW_REASONS: readonly DrawReason[] = [
  'agreement',
  'repetition',
  'noProgress',
  'mutualBlockade',
];

function parseOutcome(value: unknown): Outcome | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>;
  if (o.kind === 'win') {
    if (!isPlayer(o.winner)) return null;
    if (!WIN_REASONS.includes(o.reason as WinReason)) return null;
    return { kind: 'win', winner: o.winner, reason: o.reason as WinReason };
  }
  if (o.kind === 'draw') {
    if (!DRAW_REASONS.includes(o.reason as DrawReason)) return null;
    return { kind: 'draw', reason: o.reason as DrawReason };
  }
  return null;
}

function parseHistory(value: unknown): MoveRecord[] {
  if (!Array.isArray(value)) return [];
  const out: MoveRecord[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (!isPlayer(r.player)) continue;
    const kind = r.kind;
    if (kind !== 'place' && kind !== 'move' && kind !== 'removeStone' && kind !== 'endChain') {
      continue;
    }
    const captured = Array.isArray(r.captured)
      ? r.captured.filter((c): c is number => Number.isInteger(c) && c >= 0 && c < CELL_COUNT)
      : [];
    out.push({
      ply: asInt(r.ply, 0, 0, Number.MAX_SAFE_INTEGER),
      player: r.player,
      kind,
      from: asInt(r.from, -1, -1, CELL_COUNT - 1),
      to: asInt(r.to, -1, -1, CELL_COUNT - 1),
      captured,
    });
  }
  return out;
}

function parsePositionCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(count);
    if (typeof key === 'string' && Number.isFinite(n) && n > 0) {
      out[key] = Math.floor(n);
    }
  }
  return out;
}

/**
 * Rehydrates a saved game. Returns null for anything unrecognised, corrupt, or
 * from a future save version rather than throwing.
 */
export function deserializeGame(text: string | null | undefined): GameState | null {
  if (!text) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const data = raw as Record<string, unknown>;
  if (data.v !== SAVE_VERSION) return null;
  if (typeof data.board !== 'string') return null;

  let board;
  try {
    board = boardFromString(data.board);
  } catch {
    return null;
  }

  const phase = PHASES.includes(data.phase as Phase) ? (data.phase as Phase) : null;
  if (!phase) return null;
  if (!isPlayer(data.turn)) return null;

  const inHandRaw = (data.inHand ?? {}) as Record<string, unknown>;
  const inHand = {
    Light: asInt(inHandRaw.Light, 0, 0, 64),
    Dark: asInt(inHandRaw.Dark, 0, 0, 64),
  };

  const state: GameState = {
    board,
    phase,
    turn: data.turn,
    inHand,
    placementsLeftThisTurn: asInt(data.placementsLeftThisTurn, 0, 0, 2),
    chainFrom: asInt(data.chainFrom, -1, -1, CELL_COUNT - 1),
    blockedPlayer: isPlayer(data.blockedPlayer) ? data.blockedPlayer : null,
    blockadeExtraTurns: asInt(data.blockadeExtraTurns, 0, 0, 10_000),
    variant: normalizeVariant(data.variant as Partial<VariantFlags> | null),
    outcome: parseOutcome(data.outcome),
    ply: asInt(data.ply, 0, 0, Number.MAX_SAFE_INTEGER),
    quietPlies: asInt(data.quietPlies, 0, 0, 10_000),
    positionCounts: parsePositionCounts(data.positionCounts),
    history: parseHistory(data.history),
    drawOffer: isPlayer(data.drawOffer) ? data.drawOffer : null,
  };

  // Structural consistency: a chain must point at a real stone of the mover,
  // and blockadeRemoval must name a blocked player.
  if (state.phase === 'chain' && state.chainFrom < 0) return null;
  if (state.phase === 'blockadeRemoval' && !state.blockedPlayer) return null;

  return state;
}
