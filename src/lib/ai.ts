// FILE: src/lib/ai.ts

import { GameState, Player, Cell, AIDifficulty } from './types';
import { 
  movesFor, 
  placementsFor, 
  applyMove, 
  applyPlacement, 
  countStones, 
  checkWin,
  isCenter,
  neighbors,
  resolveCaptures,
  hasAnyLegalMove
} from './rules';

interface AIMove {
  type: 'placement' | 'movement';
  cells: Cell[];
  from?: Cell;
  to?: Cell;
}

interface EvaluationWeights {
  stoneCount: number;
  centerControl: number;
  mobility: number;
  captures: number;
  positioning: number;
  safety: number;
}

const DIFFICULTY_CONFIGS: Record<AIDifficulty, { depth: number; weights: EvaluationWeights }> = {
  beginner: {
    depth: 1,
    weights: {
      stoneCount: 10,
      centerControl: 1,
      mobility: 0.5,
      captures: 20,
      positioning: 0.5,
      safety: 0.5
    }
  },
  easy: {
    depth: 2,
    weights: {
      stoneCount: 10,
      centerControl: 2,
      mobility: 1,
      captures: 15,
      positioning: 1,
      safety: 1
    }
  },
  medium: {
    depth: 3,
    weights: {
      stoneCount: 10,
      centerControl: 5,
      mobility: 3,
      captures: 20,
      positioning: 4,
      safety: 3
    }
  },
  hard: {
    depth: 4,
    weights: {
      stoneCount: 10,
      centerControl: 8,
      mobility: 5,
      captures: 25,
      positioning: 7,
      safety: 6
    }
  }
};

/**
 * Evaluates a game position from the perspective of the given player
 */
function evaluatePosition(state: GameState, player: Player, weights: EvaluationWeights): number {
  const opponent = player === 'Light' ? 'Dark' : 'Light';
  
  // Check for immediate win/loss
  const winner = checkWin(state);
  if (winner === player) return 10000;
  if (winner === opponent) return -10000;
  
  let score = 0;
  
  // Stone count difference
  const playerStones = countStones(state, player);
  const opponentStones = countStones(state, opponent);
  score += (playerStones - opponentStones) * weights.stoneCount;
  
  // Center control
  if (state.board[3][3] === player) {
    score += weights.centerControl;
  } else if (state.board[3][3] === opponent) {
    score -= weights.centerControl;
  }
  
  // Mobility (number of legal moves)
  const playerMobility = calculateMobility(state, player);
  const opponentMobility = calculateMobility(state, opponent);
  score += (playerMobility - opponentMobility) * weights.mobility;
  
  // Positioning (stones near center and edges)
  score += evaluatePositioning(state, player, weights.positioning);
  score -= evaluatePositioning(state, opponent, weights.positioning);
  
  // Safety (stones that can't be easily captured)
  score += evaluateSafety(state, player, weights.safety);
  score -= evaluateSafety(state, opponent, weights.safety);
  
  return score;
}

/**
 * Calculate the number of legal moves for a player
 */
function calculateMobility(state: GameState, player: Player): number {
  if (state.phase === 'placement') {
    return placementsFor(state, player).length;
  }
  
  let moveCount = 0;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (state.board[r][c] === player) {
        moveCount += movesFor(state, { r, c }).length;
      }
    }
  }
  return moveCount;
}

/**
 * Evaluate positioning quality (center proximity, edge control)
 */
function evaluatePositioning(state: GameState, player: Player, weight: number): number {
  let score = 0;
  
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (state.board[r][c] === player) {
        // Distance from center (closer is better)
        const distanceFromCenter = Math.abs(r - 3) + Math.abs(c - 3);
        score += Math.max(0, 6 - distanceFromCenter) * 0.5;
        
        // Edge control (corners and edges are valuable)
        if ((r === 0 || r === 6) && (c === 0 || c === 6)) {
          score += 3; // Corners
        } else if (r === 0 || r === 6 || c === 0 || c === 6) {
          score += 1; // Edges
        }
      }
    }
  }
  
  return score * weight;
}

/**
 * Evaluate stone safety (how protected they are from capture)
 */
function evaluateSafety(state: GameState, player: Player, weight: number): number {
  let score = 0;
  
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (state.board[r][c] === player) {
        const cell = { r, c };
        
        // Center is completely safe
        if (isCenter(cell)) {
          score += 5;
          continue;
        }
        
        // Count friendly neighbors (more neighbors = safer)
        const friendlyNeighbors = neighbors(cell)
          .filter(neighbor => 
            neighbor.r >= 0 && neighbor.r < 7 && 
            neighbor.c >= 0 && neighbor.c < 7 &&
            state.board[neighbor.r][neighbor.c] === player
          ).length;
        
        score += friendlyNeighbors * 0.5;
      }
    }
  }
  
  return score * weight;
}

/**
 * Minimax algorithm with alpha-beta pruning
 */
function minimax(
  state: GameState, 
  depth: number, 
  maximizingPlayer: boolean, 
  player: Player,
  weights: EvaluationWeights,
  alpha: number = -Infinity,
  beta: number = Infinity
): number {
  if (depth === 0 || checkWin(state)) {
    return evaluatePosition(state, player, weights);
  }
  
  const currentPlayer = state.current;
  const moves = generateAllMoves(state);
  
  if (moves.length === 0) {
    return evaluatePosition(state, player, weights);
  }
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newState = applyMoveToState(state, move);
      const eval_ = minimax(newState, depth - 1, false, player, weights, alpha, beta);
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newState = applyMoveToState(state, move);
      const eval_ = minimax(newState, depth - 1, true, player, weights, alpha, beta);
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return minEval;
  }
}

/**
 * Generate all possible moves for the current player
 */
function generateAllMoves(state: GameState): AIMove[] {
  const moves: AIMove[] = [];
  
  if (state.phase === 'placement') {
    const placements = placementsFor(state, state.current);
    
    if (state.placementCount === 0) {
      // First stone of turn - generate single placements
      for (const cell of placements) {
        moves.push({
          type: 'placement',
          cells: [cell]
        });
      }
    } else {
      // Second stone of turn - generate remaining placements
      for (const cell of placements) {
        moves.push({
          type: 'placement',
          cells: [cell]
        });
      }
    }
  } else {
    // Movement phase
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (state.board[r][c] === state.current) {
          const from = { r, c };
          const destinations = movesFor(state, from);
          
          for (const to of destinations) {
            moves.push({
              type: 'movement',
              cells: [from, to],
              from,
              to
            });
          }
        }
      }
    }
  }
  
  return moves;
}

/**
 * Apply a move to create a new game state (for evaluation)
 */
function applyMoveToState(state: GameState, move: AIMove): GameState {
  if (move.type === 'placement') {
    // Simulate placement
    const newState = JSON.parse(JSON.stringify(state)); // Deep copy
    
    const cell = move.cells[0];
    newState.board[cell.r][cell.c] = state.current;
    
    if (state.placementCount === 0) {
      newState.placementCount = 1;
      newState.stonesToPlace = {
        ...state.stonesToPlace,
        [state.current]: state.stonesToPlace[state.current] - 1
      };
    } else {
      newState.placementCount = 0;
      newState.current = state.current === 'Light' ? 'Dark' : 'Light';
      newState.stonesToPlace = {
        ...state.stonesToPlace,
        [state.current]: state.stonesToPlace[state.current] - 1
      };
      
      if (newState.stonesToPlace.Light <= 0 && newState.stonesToPlace.Dark <= 0) {
        newState.phase = 'movement';
      }
    }
    
    return newState;
  } else {
    // Apply move using existing game logic
    return applyMove(state, move.from!, move.to!);
  }
}

/**
 * Get the best move for the AI player
 */
export function getBestAIMove(state: GameState, difficulty: AIDifficulty): AIMove | null {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const moves = generateAllMoves(state);
  
  if (moves.length === 0) {
    return null;
  }
  
  // For beginner difficulty, make many random moves
  if (difficulty === 'beginner' && Math.random() < 0.6) {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  
  // For easy difficulty, add some randomness
  if (difficulty === 'easy' && Math.random() < 0.3) {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  
  let bestMove = moves[0];
  let bestScore = -Infinity;
  
  for (const move of moves) {
    const newState = applyMoveToState(state, move);
    
    // Evaluate immediate captures first
    if (move.type === 'movement') {
      const captures = resolveCaptures(newState, move.to!);
      if (captures.captured.length > 0) {
        bestScore += captures.captured.length * config.weights.captures;
      }
    }
    
    const score = minimax(
      newState, 
      config.depth - 1, 
      false, 
      state.current, 
      config.weights
    );
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove;
}

/**
 * Check if the current player is an AI
 */
export function isAITurn(state: GameState, playerConfigs: { Light: { type: 'human' | 'ai' }; Dark: { type: 'human' | 'ai' } }): boolean {
  return playerConfigs[state.current].type === 'ai';
}