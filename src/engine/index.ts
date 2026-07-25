// FILE: src/engine/index.ts
//
// Public surface of the Seejeh rules engine. Everything the UI, the AI and the
// tests need comes from here; nothing outside this folder implements a rule.

export {
  CELL_COUNT,
  CENTER,
  DARK,
  DIRECTIONS,
  EMPTY,
  LIGHT,
  NEIGHBOURS,
  PLACEMENTS_PER_TURN,
  SIZE,
  STONES_PER_PLAYER,
  areAdjacent,
  boardFromDiagram,
  boardFromString,
  boardToDiagram,
  boardToString,
  cloneBoard,
  colOf,
  createBoard,
  inBounds,
  isCenter,
  rowOf,
  step,
  toIndex,
} from './board';
export type { Board, CellValue } from './board';

export {
  blockadeRemovalChoices,
  capturesAt,
  cellValueOf,
  chainMoves,
  hasAnyMovementMove,
  legalMoves,
  movementMoves,
  movesFrom,
  opponentOf,
  placementTargets,
  playerAt,
  previewCaptures,
  stoneCount,
} from './rules';

export {
  applyAction,
  applyOrThrow,
  createGame,
  isGameOver,
  stonesOnBoard,
  totalStones,
} from './game';

export {
  CLASSIC_VARIANT,
  DEFAULT_VARIANT,
  LUDII_VARIANT,
  VARIANT_PRESETS,
  normalizeVariant,
} from './variants';
export type { VariantPresetName } from './variants';

export { SAVE_VERSION, deserializeGame, serializeGame } from './serialize';

export type {
  Action,
  ActionResult,
  BlockadeRule,
  DrawReason,
  FirstMoverRule,
  GameEvent,
  GameState,
  Move,
  MoveRecord,
  Outcome,
  Phase,
  Player,
  Rejection,
  RejectionCode,
  VariantFlags,
  WinReason,
} from './types';
