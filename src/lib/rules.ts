// FILE: src/lib/rules.ts

import { 
  GameState, 
  Player, 
  Cell, 
  VariantFlags, 
  CaptureResult, 
  MoveRecord 
} from './types';

const BOARD_SIZE = 7;
const STONES_PER_PLAYER = 24;
const WIN_THRESHOLD = 7;

/**
 * Creates initial game state for 7x7 Seejeh
 */
export function initialState7x7(variant: Partial<VariantFlags> = {}): GameState {
  const defaultVariant: VariantFlags = {
    firstMoveMustEnterCenter: false,
    antiShuttle: false,
    blockadeOneRemoval: true
  };

  return {
    board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
    current: 'Light',
    phase: 'placement',
    stonesToPlace: {
      Light: STONES_PER_PLAYER,
      Dark: STONES_PER_PLAYER
    },
    moveHistory: [],
    variant: { ...defaultVariant, ...variant },
    placementCount: 0,
    capturedLastMove: []
  };
}

/**
 * Check if a cell is the center of the board
 */
export function isCenter(cell: Cell): boolean {
  const center = Math.floor(BOARD_SIZE / 2);
  return cell.r === center && cell.c === center;
}

/**
 * Check if a cell is within board bounds
 */
export function inBounds(cell: Cell): boolean {
  return cell.r >= 0 && cell.r < BOARD_SIZE && cell.c >= 0 && cell.c < BOARD_SIZE;
}

/**
 * Get orthogonal neighbors of a cell
 */
export function neighbors(cell: Cell): Cell[] {
  const directions = [
    { r: -1, c: 0 }, // up
    { r: 1, c: 0 },  // down
    { r: 0, c: -1 }, // left
    { r: 0, c: 1 }   // right
  ];
  
  return directions
    .map(dir => ({ r: cell.r + dir.r, c: cell.c + dir.c }))
    .filter(inBounds);
}

/**
 * Get legal placement squares for current player
 */
export function placementsFor(state: GameState, player: Player): Cell[] {
  if (state.phase !== 'placement') return [];
  
  const legal: Cell[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = { r, c };
      // Cannot place in center during placement phase
      if (!isCenter(cell) && state.board[r][c] === null) {
        legal.push(cell);
      }
    }
  }
  return legal;
}

/**
 * Get legal moves for a piece at given position
 */
export function movesFor(state: GameState, from: Cell): Cell[] {
  if (state.phase === 'placement') return [];
  if (!inBounds(from) || state.board[from.r][from.c] !== state.current) return [];
  
  return neighbors(from).filter(to => state.board[to.r][to.c] === null);
}

/**
 * Apply placement of stones during placement phase
 */
export function applyPlacement(state: GameState, cell1: Cell, cell2: Cell): GameState {
  if (state.phase !== 'placement') {
    throw new Error('Not in placement phase');
  }
  
  if (state.placementCount >= 2) {
    throw new Error('Already placed 2 stones this turn');
  }
  
  const placements = [cell1, cell2].filter(Boolean);
  const newState = { ...state };
  
  // Validate each placement
  for (const cell of placements) {
    if (!inBounds(cell)) {
      throw new Error('Cell out of bounds');
    }
    if (isCenter(cell)) {
      throw new Error('Cannot place in center during placement phase');
    }
    if (state.board[cell.r][cell.c] !== null) {
      throw new Error('Cell already occupied');
    }
  }
  
  // Apply placements
  newState.board = state.board.map(row => [...row]);
  for (const cell of placements) {
    newState.board[cell.r][cell.c] = state.current;
  }
  
  newState.placementCount = state.placementCount + placements.length;
  newState.stonesToPlace = {
    ...state.stonesToPlace,
    [state.current]: state.stonesToPlace[state.current] - placements.length
  };
  
  // If placed 2 stones or no more stones to place, end turn
  if (newState.placementCount >= 2 || newState.stonesToPlace[state.current] <= 0) {
    newState.current = state.current === 'Light' ? 'Dark' : 'Light';
    newState.placementCount = 0;
    
    // Check if placement phase is complete
    if (newState.stonesToPlace.Light <= 0 && newState.stonesToPlace.Dark <= 0) {
      newState.phase = 'movement';
    }
  }
  
  return newState;
}

/**
 * Apply a single move during movement phase
 */
export function applyMove(state: GameState, from: Cell, to: Cell): GameState {
  if (state.phase === 'placement') {
    throw new Error('Still in placement phase');
  }
  
  if (!inBounds(from) || !inBounds(to)) {
    throw new Error('Cells out of bounds');
  }
  
  if (state.board[from.r][from.c] !== state.current) {
    throw new Error('No piece to move or not your piece');
  }
  
  if (state.board[to.r][to.c] !== null) {
    throw new Error('Destination occupied');
  }
  
  // Check if move is one orthogonal step
  const dx = Math.abs(to.r - from.r);
  const dy = Math.abs(to.c - from.c);
  if ((dx + dy) !== 1) {
    throw new Error('Must move exactly one orthogonal step');
  }
  
  // Apply first move center constraint if enabled
  if (state.variant.firstMoveMustEnterCenter && 
      state.moveHistory.length === 0 && 
      !isCenter(to)) {
    throw new Error('First move must enter center');
  }
  
  // Check anti-shuttle rule if enabled
  if (state.variant.antiShuttle) {
    const pieceId = `${from.r},${from.c}`;
    const recentMoves = state.moveHistory
      .filter(m => m.pieceId === pieceId)
      .slice(-4); // Last 4 moves of this piece
    
    if (recentMoves.length >= 4) {
      const isShuttling = recentMoves.every((move, i) => {
        if (i % 2 === 0) {
          return move.from.r === to.r && move.from.c === to.c;
        } else {
          return move.to.r === to.r && move.to.c === to.c;
        }
      });
      
      if (isShuttling) {
        throw new Error('Anti-shuttle rule prevents this move');
      }
    }
  }
  
  const newState = { ...state };
  newState.board = state.board.map(row => [...row]);
  
  // Move the piece
  newState.board[from.r][from.c] = null;
  newState.board[to.r][to.c] = state.current;
  
  // Record the move
  const moveRecord: MoveRecord = {
    pieceId: `${from.r},${from.c}`,
    from,
    to,
    timestamp: Date.now()
  };
  newState.moveHistory = [...state.moveHistory, moveRecord];
  
  // Check for captures
  const captureResult = resolveCaptures(newState, to);
  newState.capturedLastMove = captureResult.captured;
  
  // Remove captured pieces
  for (const captured of captureResult.captured) {
    newState.board[captured.r][captured.c] = null;
  }
  
  // If captures were made, enter chain mode with same player
  if (captureResult.captured.length > 0) {
    newState.phase = 'chain';
    newState.chainOrigin = to;
  } else {
    // No captures, end turn
    newState.current = state.current === 'Light' ? 'Dark' : 'Light';
  }
  
  // Check win condition
  const winner = checkWin(newState);
  if (winner) {
    newState.winner = winner;
  }
  
  return newState;
}

/**
 * Apply a chain capture step
 */
export function applyChainStep(state: GameState, to: Cell): GameState {
  if (state.phase !== 'chain' || !state.chainOrigin) {
    throw new Error('Not in chain capture mode');
  }
  
  return applyMove({ ...state, phase: 'movement' }, state.chainOrigin, to);
}

/**
 * End chain capture sequence
 */
export function endChain(state: GameState): GameState {
  if (state.phase !== 'chain') {
    throw new Error('Not in chain mode');
  }
  
  return {
    ...state,
    phase: 'movement',
    current: state.current === 'Light' ? 'Dark' : 'Light',
    chainOrigin: undefined
  };
}

/**
 * Resolve custodian captures from a moved piece
 */
export function resolveCaptures(state: GameState, movedTo: Cell): CaptureResult {
  const captured: Cell[] = [];
  const player = state.board[movedTo.r][movedTo.c];
  const opponent = player === 'Light' ? 'Dark' : 'Light';
  
  if (!player) return { captured };
  
  // Check all four orthogonal directions
  const directions = [
    { r: -1, c: 0 }, // up
    { r: 1, c: 0 },  // down
    { r: 0, c: -1 }, // left
    { r: 0, c: 1 }   // right
  ];
  
  for (const dir of directions) {
    const line: Cell[] = [];
    let pos = { r: movedTo.r + dir.r, c: movedTo.c + dir.c };
    
    // Collect contiguous opponent stones in this direction
    while (inBounds(pos) && state.board[pos.r][pos.c] === opponent) {
      // Center cell cannot be captured
      if (!isCenter(pos)) {
        line.push({ ...pos });
      }
      pos = { r: pos.r + dir.r, c: pos.c + dir.c };
    }
    
    // Check if line is bounded by friendly stone
    if (line.length > 0 && 
        inBounds(pos) && 
        state.board[pos.r][pos.c] === player) {
      captured.push(...line);
    }
  }
  
  return { captured };
}

/**
 * Check if player has any legal moves
 */
export function hasAnyLegalMove(state: GameState, player: Player): boolean {
  if (state.phase === 'placement') {
    return placementsFor(state, player).length > 0;
  }
  
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (state.board[r][c] === player) {
        if (movesFor(state, { r, c }).length > 0) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Handle blockade situation
 */
export function invokeBlockadeIfAny(state: GameState, removeCell?: Cell): GameState {
  if (!state.variant.blockadeOneRemoval) return state;
  
  const currentPlayer = state.current;
  if (hasAnyLegalMove(state, currentPlayer)) return state;
  
  if (!removeCell) {
    // Return state indicating blockade needs resolution
    return { ...state, winner: undefined };
  }
  
  // Remove the specified stone
  if (!inBounds(removeCell) || state.board[removeCell.r][removeCell.c] !== currentPlayer) {
    throw new Error('Invalid stone to remove');
  }
  
  const newState = { ...state };
  newState.board = state.board.map(row => [...row]);
  newState.board[removeCell.r][removeCell.c] = null;
  
  return newState;
}

/**
 * Check win condition
 */
export function checkWin(state: GameState): Player | undefined {
  const lightCount = countStones(state, 'Light');
  const darkCount = countStones(state, 'Dark');
  
  if (lightCount <= WIN_THRESHOLD) return 'Dark';
  if (darkCount <= WIN_THRESHOLD) return 'Light';
  
  return undefined;
}

/**
 * Count stones for a player
 */
export function countStones(state: GameState, player: Player): number {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (state.board[r][c] === player) {
        count++;
      }
    }
  }
  return count;
}