// FILE: src/lib/rules.ts

import { 
  GameState, 
  Player, 
  Cell, 
  VariantFlags, 
  CaptureResult, 
  MoveRecord,
  WinReason
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
    capturedLastMove: [],
    stalemateOffers: {
      Light: false,
      Dark: false
    },
    moveRepetition: 0
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
  
  // Track board repetition for stalemate detection
  const currentBoardHash = createBoardHash(newState);
  if (currentBoardHash === state.lastBoardHash) {
    newState.moveRepetition = state.moveRepetition + 1;
  } else {
    newState.moveRepetition = 0;
  }
  newState.lastBoardHash = currentBoardHash;
  
  // If captures were made, enter chain mode with same player
  if (captureResult.captured.length > 0) {
    newState.phase = 'chain';
    newState.chainOrigin = to;
  } else {
    // No captures, end turn
    newState.current = state.current === 'Light' ? 'Dark' : 'Light';
  }
  
  // Check win condition
  const winResult = checkWin(newState);
  if (winResult) {
    newState.winner = winResult.winner;
    newState.winReason = winResult.reason;
  }
  
  // Check for automatic stalemate detection
  const stalemateCheck = detectStalemate(newState);
  if (stalemateCheck.winner !== undefined || stalemateCheck.winner === null) {
    return stalemateCheck;
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
 * Preview what stones would be captured if a piece moved to a destination
 * This is used for visual feedback without actually modifying the game state
 */
export function previewCaptures(state: GameState, from: Cell, to: Cell): Cell[] {
  // Validate the move is legal first
  const validMoves = movesFor(state, from);
  const isValidMove = validMoves.some(move => move.r === to.r && move.c === to.c);
  if (!isValidMove) return [];
  
  const player = state.board[from.r][from.c];
  if (!player) return [];
  
  const opponent = player === 'Light' ? 'Dark' : 'Light';
  const captured: Cell[] = [];
  
  // Check all four orthogonal directions from the destination
  const directions = [
    { r: -1, c: 0 }, // up
    { r: 1, c: 0 },  // down
    { r: 0, c: -1 }, // left
    { r: 0, c: 1 }   // right
  ];
  
  for (const dir of directions) {
    const line: Cell[] = [];
    let pos = { r: to.r + dir.r, c: to.c + dir.c };
    
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
  
  return captured;
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
export function checkWin(state: GameState): { winner: Player | null; reason: WinReason } | undefined {
  const lightCount = countStones(state, 'Light');
  const darkCount = countStones(state, 'Dark');
  
  if (lightCount <= WIN_THRESHOLD) {
    return {
      winner: 'Dark',
      reason: {
        type: 'stoneCount',
        loserStoneCount: lightCount,
        threshold: WIN_THRESHOLD,
        loser: 'Light'
      }
    };
  }
  
  if (darkCount <= WIN_THRESHOLD) {
    return {
      winner: 'Light', 
      reason: {
        type: 'stoneCount',
        loserStoneCount: darkCount,
        threshold: WIN_THRESHOLD,
        loser: 'Dark'
      }
    };
  }
  
  // Check for stalemate by mutual agreement
  if (state.stalemateOffers.Light && state.stalemateOffers.Dark) {
    const winner = lightCount > darkCount ? 'Light' : 
                  darkCount > lightCount ? 'Dark' : null;
    return {
      winner,
      reason: {
        type: 'stalemate',
        drawType: 'mutual'
      }
    };
  }
  
  // Check for stalemate by repetition (simplified)
  if (state.moveRepetition >= 6) {
    const winner = lightCount > darkCount ? 'Light' : 
                  darkCount > lightCount ? 'Dark' : null;
    return {
      winner,
      reason: {
        type: 'stalemate',
        drawType: 'repetition'
      }
    };
  }
  
  return undefined;
}

/**
 * Offer stalemate from current player
 */
export function offerStalemate(state: GameState): GameState {
  const newState = { ...state };
  newState.stalemateOffers = {
    ...state.stalemateOffers,
    [state.current]: true
  };
  
  // Check if both players have now offered stalemate
  const winResult = checkWin(newState);
  if (winResult) {
    newState.winner = winResult.winner;
    newState.winReason = winResult.reason;
  }
  
  return newState;
}

/**
 * Reject stalemate offer
 */
export function rejectStalemate(state: GameState, player: Player): GameState {
  const newState = { ...state };
  newState.stalemateOffers = {
    ...state.stalemateOffers,
    [player]: false
  };
  return newState;
}

/**
 * Resign the game
 */
export function resignGame(state: GameState, resigningPlayer: Player): GameState {
  const winner = resigningPlayer === 'Light' ? 'Dark' : 'Light';
  
  return {
    ...state,
    winner,
    winReason: {
      type: 'resignation',
      resignedPlayer: resigningPlayer
    }
  };
}

/**
 * Create a hash of the board state for repetition detection
 */
export function createBoardHash(state: GameState): string {
  return JSON.stringify({
    board: state.board,
    current: state.current,
    phase: state.phase
  });
}

/**
 * Check for insufficient material (too few pieces to continue meaningfully)
 */
export function checkInsufficientMaterial(state: GameState): boolean {
  const lightCount = countStones(state, 'Light');
  const darkCount = countStones(state, 'Dark');
  const totalStones = lightCount + darkCount;
  
  // If total stones on board is very low and no captures happened recently
  return totalStones <= 6 && state.capturedLastMove.length === 0;
}

/**
 * Detect if both players are unable to make progress
 */
export function detectStalemate(state: GameState): GameState {
  if (state.phase !== 'movement') return state;
  
  const lightHasMoves = hasAnyLegalMove(state, 'Light');
  const darkHasMoves = hasAnyLegalMove(state, 'Dark');
  
  // If neither player can move, it's a stalemate
  if (!lightHasMoves && !darkHasMoves) {
    const lightCount = countStones(state, 'Light');
    const darkCount = countStones(state, 'Dark');
    const winner = lightCount > darkCount ? 'Light' : 
                  darkCount > lightCount ? 'Dark' : null;
    
    return {
      ...state,
      winner,
      winReason: {
        type: 'stalemate',
        drawType: 'insufficient'
      }
    };
  }
  
  // Check for insufficient material
  if (checkInsufficientMaterial(state)) {
    const lightCount = countStones(state, 'Light');
    const darkCount = countStones(state, 'Dark');
    const winner = lightCount > darkCount ? 'Light' : 
                  darkCount > lightCount ? 'Dark' : null;
    
    return {
      ...state,
      winner,
      winReason: {
        type: 'stalemate',
        drawType: 'insufficient'
      }
    };
  }
  
  return state;
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