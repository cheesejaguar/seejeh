// FILE: src/lib/ai.ts

import { GameState, Player, Cell, AIDifficulty, MoveAnalysis, AIMove, MoveExplanation } from './types';
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
  const winResult = checkWin(state);
  if (winResult?.winner === player) return 10000;
  if (winResult?.winner === opponent) return -10000;
  
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
  if (depth === 0 || checkWin(state) !== undefined) {
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

/**
 * Get the best move for hints - always use high difficulty for optimal analysis
 */
export function getOptimalMove(state: GameState): AIMove | null {
  const config = DIFFICULTY_CONFIGS.hard; // Always use highest difficulty for hints
  const moves = generateAllMoves(state);
  
  if (moves.length === 0) {
    return null;
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
 * Get top 3 best moves for hints with scores
 */
export function getTopMoves(state: GameState, count: number = 3): Array<{ move: AIMove; score: number; description: string }> {
  const config = DIFFICULTY_CONFIGS.hard;
  const moves = generateAllMoves(state);
  
  if (moves.length === 0) {
    return [];
  }
  
  const scoredMoves = moves.map(move => {
    const newState = applyMoveToState(state, move);
    let score = minimax(newState, config.depth - 1, false, state.current, config.weights);
    
    let description = '';
    
    // Add immediate capture bonus and description
    if (move.type === 'movement') {
      const captures = resolveCaptures(newState, move.to!);
      if (captures.captured.length > 0) {
        score += captures.captured.length * config.weights.captures;
        description = `Captures ${captures.captured.length} stone${captures.captured.length > 1 ? 's' : ''}`;
      } else {
        // Analyze positional benefits
        if (isCenter(move.to!)) {
          description = 'Secure center position';
        } else {
          const mobility = calculateMobility(newState, state.current);
          if (mobility > calculateMobility(state, state.current)) {
            description = 'Improves mobility';
          } else {
            description = 'Strengthens position';
          }
        }
      }
    } else {
      // Placement description
      if (move.cells[0] && Math.abs(move.cells[0].r - 3) + Math.abs(move.cells[0].c - 3) <= 2) {
        description = 'Near center position';
      } else {
        description = 'Strategic placement';
      }
    }
    
    return { move, score, description };
  });
  
  // Sort by score descending and take top moves
  return scoredMoves
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

/**
 * Decide if AI should accept a stalemate offer
 */
export function shouldAIAcceptStalemate(state: GameState, difficulty: AIDifficulty): boolean {
  const aiPlayer = state.current;
  const humanPlayer = aiPlayer === 'Light' ? 'Dark' : 'Light';
  
  const aiStones = countStones(state, aiPlayer);
  const humanStones = countStones(state, humanPlayer);
  
  // Basic decision factors
  const stoneDifference = aiStones - humanStones;
  const totalStones = aiStones + humanStones;
  
  // If AI is significantly behind, more likely to accept
  if (stoneDifference <= -3) {
    return true;
  }
  
  // If AI is ahead, less likely to accept unless game is nearly over
  if (stoneDifference >= 2 && totalStones > 12) {
    return false;
  }
  
  // Check mobility
  const aiMobility = calculateMobility(state, aiPlayer);
  const humanMobility = calculateMobility(state, humanPlayer);
  
  // If AI has no moves and human does, accept stalemate
  if (aiMobility === 0 && humanMobility > 0) {
    return true;
  }
  
  // Difficulty-based decision making
  switch (difficulty) {
    case 'beginner':
      // More likely to accept, especially if close
      return Math.abs(stoneDifference) <= 2 || totalStones <= 10;
      
    case 'easy':
      // Moderate decision making
      return stoneDifference <= 0 || (totalStones <= 8 && Math.abs(stoneDifference) <= 1);
      
    case 'medium':
      // More strategic, only accept if behind or very close game
      return stoneDifference < 0 || (totalStones <= 6 && stoneDifference <= 1);
      
    case 'hard':
      // Only accept if clearly losing or truly stalemated
      return stoneDifference <= -2 || (aiMobility === 0 && totalStones <= 8);
      
    default:
      return false;
  }
}

/**
 * Decide if AI should offer a stalemate
 */
export function shouldAIOfferStalemate(state: GameState, difficulty: AIDifficulty): boolean {
  const aiPlayer = state.current;
  const humanPlayer = aiPlayer === 'Light' ? 'Dark' : 'Light';
  
  const aiStones = countStones(state, aiPlayer);
  const humanStones = countStones(state, humanPlayer);
  const totalStones = aiStones + humanStones;
  
  // Only consider offering stalemate in movement phase
  if (state.phase !== 'movement') {
    return false;
  }
  
  // Don't offer if AI is winning significantly
  if (aiStones - humanStones >= 3) {
    return false;
  }
  
  // Check for low material situations
  if (totalStones <= 8) {
    const aiMobility = calculateMobility(state, aiPlayer);
    const humanMobility = calculateMobility(state, humanPlayer);
    
    // If both players have very limited mobility
    if (aiMobility <= 1 && humanMobility <= 1) {
      return true;
    }
    
    // If AI is slightly behind in a low-material endgame
    if (aiStones === humanStones - 1 && totalStones <= 6) {
      return difficulty === 'beginner' || difficulty === 'easy';
    }
  }
  
  // Check for repetitive position (simplified)
  if (state.moveRepetition >= 4) {
    return true;
  }
  
  return false;
}

/**
 * Analyze a specific AI move and explain why it was chosen
 */
export function analyzeAIMove(
  state: GameState, 
  move: AIMove, 
  difficulty: AIDifficulty
): MoveAnalysis {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const newState = applyMoveToState(state, move);
  
  // Calculate evaluation factors
  const factors = {
    captures: 0,
    centerControl: 0,
    mobility: 0,
    safety: 0,
    positioning: 0
  };
  
  const reasoning: string[] = [];
  
  // Analyze captures
  if (move.type === 'movement' && move.to) {
    const captures = resolveCaptures(newState, move.to);
    factors.captures = captures.captured.length;
    
    if (captures.captured.length > 0) {
      reasoning.push(`Captures ${captures.captured.length} opponent stone${captures.captured.length > 1 ? 's' : ''}`);
    }
  }
  
  // Analyze center control
  if (move.type === 'movement' && move.to && isCenter(move.to)) {
    factors.centerControl = 1;
    reasoning.push("Secures the powerful center position");
  } else if (move.type === 'placement') {
    // Check proximity to center for placements
    const centerDistance = move.cells.map(cell => 
      Math.abs(cell.r - 3) + Math.abs(cell.c - 3)
    ).reduce((min, dist) => Math.min(min, dist), Infinity);
    
    if (centerDistance <= 2) {
      factors.centerControl = 0.5;
      reasoning.push("Places stones near the strategic center area");
    }
  }
  
  // Analyze mobility changes
  const oldMobility = calculateMobility(state, state.current);
  const newMobility = calculateMobility(newState, state.current);
  factors.mobility = newMobility - oldMobility;
  
  if (factors.mobility > 0) {
    reasoning.push("Improves future movement options");
  } else if (factors.mobility < -1) {
    reasoning.push("Sacrifices mobility for tactical gain");
  }
  
  // Analyze positioning
  if (move.type === 'movement' && move.from && move.to) {
    const enemyNeighbors = neighbors(move.to).filter(cell => 
      state.board[cell.r]?.[cell.c] === (state.current === 'Light' ? 'Dark' : 'Light')
    );
    
    if (enemyNeighbors.length >= 2) {
      factors.positioning = 0.8;
      reasoning.push("Moves into aggressive position near enemy stones");
    }
    
    // Check if creating formation
    const friendlyNeighbors = neighbors(move.to).filter(cell => 
      state.board[cell.r]?.[cell.c] === state.current
    );
    
    if (friendlyNeighbors.length >= 2) {
      factors.positioning = 0.6;
      reasoning.push("Forms strong defensive formation");
    }
  }
  
  // Analyze safety
  if (move.type === 'movement' && move.to) {
    const isToSafe = isCenter(move.to);
    if (isToSafe) {
      factors.safety = 1;
      reasoning.push("Moves to safety of the center square");
    } else {
      // Check if move puts piece at risk
      const enemyNeighbors = neighbors(move.to).filter(cell => 
        state.board[cell.r]?.[cell.c] === (state.current === 'Light' ? 'Dark' : 'Light')
      );
      
      if (enemyNeighbors.length === 0) {
        factors.safety = 0.3;
        reasoning.push("Maintains safe distance from enemy stones");
      }
    }
  }
  
  // Calculate overall score
  const score = evaluatePosition(newState, state.current, config.weights);
  
  // Determine confidence based on score difference and move strength
  const scoreImprovement = score - evaluatePosition(state, state.current, config.weights);
  let confidence = Math.min(100, Math.max(10, 50 + scoreImprovement * 10));
  
  // Boost confidence for clear tactical moves
  if (factors.captures > 0) {
    confidence = Math.min(100, confidence + 20);
  }
  
  // Reduce confidence for risky moves
  if (factors.safety < 0) {
    confidence = Math.max(10, confidence - 15);
  }
  
  // Add strategic reasoning based on difficulty
  if (reasoning.length === 0) {
    switch (difficulty) {
      case 'beginner':
        reasoning.push("Basic positional move");
        break;
      case 'easy':
        reasoning.push("Simple strategic improvement");
        break;
      case 'medium':
        reasoning.push("Calculated positional advantage");
        break;
      case 'hard':
        reasoning.push("Deep strategic consideration");
        break;
    }
  }
  
  return {
    move,
    score,
    reasoning,
    factors,
    confidence: Math.round(confidence)
  };
}

/**
 * Generate detailed explanation for a move
 */
export function explainMove(analysis: MoveAnalysis): MoveExplanation {
  const { move, factors, reasoning, confidence } = analysis;
  
  let primary = reasoning[0] || "Strategic positioning move";
  const details = reasoning.slice(1);
  
  // Determine move strength
  let strength: 'weak' | 'good' | 'strong' | 'excellent';
  let evaluationReasoning: string;
  
  if (confidence >= 85) {
    strength = 'excellent';
    evaluationReasoning = "This move provides significant tactical or strategic advantage.";
  } else if (confidence >= 70) {
    strength = 'strong';
    evaluationReasoning = "This move offers clear benefits with minimal risk.";
  } else if (confidence >= 50) {
    strength = 'good';
    evaluationReasoning = "This move maintains position with some potential upside.";
  } else {
    strength = 'weak';
    evaluationReasoning = "This move may be forced or offers limited benefit.";
  }
  
  // Add specific tactical details
  if (factors.captures > 0) {
    details.unshift(`Immediately removes ${factors.captures} enemy stone${factors.captures > 1 ? 's' : ''} from the board`);
  }
  
  if (factors.centerControl > 0) {
    details.push("Center control is crucial for both offense and defense");
  }
  
  if (factors.mobility > 1) {
    details.push("Increased mobility provides more tactical options");
  }
  
  if (factors.safety > 0.5) {
    details.push("Safety is prioritized to prevent counterattacks");
  }
  
  return {
    primary,
    details,
    evaluation: {
      strength,
      reasoning: evaluationReasoning
    }
  };
}

/**
 * Get the last AI move analysis from game state
 */
export function getLastAIMoveAnalysis(
  state: GameState, 
  difficulty: AIDifficulty
): MoveAnalysis | null {
  if (state.moveHistory.length === 0) {
    return null;
  }
  
  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  
  // Convert move record to AI move format
  const aiMove: AIMove = {
    type: 'movement',
    cells: [lastMove.to],
    from: lastMove.from,
    to: lastMove.to
  };
  
  // Get previous state (this is simplified - in a real implementation 
  // you'd want to track the actual previous state)
  return analyzeAIMove(state, aiMove, difficulty);
}