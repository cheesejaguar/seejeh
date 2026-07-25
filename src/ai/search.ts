// FILE: src/ai/search.ts
//
// Negamax with alpha-beta, iterative deepening, a transposition table and a
// capture-only quiescence search.
//
// IMPORTANT: Seejeh is not strictly alternating — a player keeps the move
// during a capture chain and during a blockade extra turn. A textbook negamax
// that negates on every ply is therefore WRONG here (it was, in fact, one of
// the critical bugs in the previous AI). This implementation negates only when
// the side to move actually changes.

import {
  CELL_COUNT,
  applyAction,
  legalMoves,
  type Action,
  type GameState,
  type Outcome,
  type Player,
} from '../engine';
import {
  DEFAULT_WEIGHTS,
  WIN_SCORE,
  evaluate,
  scorePlacement,
  type EvalWeights,
} from './evaluate';

export type AIMove =
  | { kind: 'place'; at: number }
  | { kind: 'move'; from: number; to: number }
  | { kind: 'removeStone'; at: number }
  | { kind: 'endChain' };

export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  maxDepth: number;
  timeBudgetMs: number;
  /** 0 = always best, 1 = very loose. Scales noise added to root scores. */
  randomness: number;
  quiescence: boolean;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  beginner: { maxDepth: 1, timeBudgetMs: 150, randomness: 1.0, quiescence: false },
  easy: { maxDepth: 2, timeBudgetMs: 300, randomness: 0.45, quiescence: false },
  medium: { maxDepth: 4, timeBudgetMs: 800, randomness: 0.12, quiescence: true },
  hard: { maxDepth: 10, timeBudgetMs: 1800, randomness: 0, quiescence: true },
};

export interface SearchResult {
  move: AIMove | null;
  score: number;
  depth: number;
  nodes: number;
  elapsedMs: number;
  /** Principal-variation-ish ranking of the root moves, best first. */
  ranked: Array<{ move: AIMove; score: number }>;
}

const INFINITY = 1 << 30;
const MAX_QUIESCENCE_PLY = 6;

// --- Zobrist hashing -------------------------------------------------------

function makeZobrist(): {
  cells: Int32Array;
  side: number;
  phase: Int32Array;
  blocked: Int32Array;
} {
  // Fixed seed so hashing is reproducible across worker restarts.
  let s = 0x9e3779b9;
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return s | 0;
  };
  const cells = new Int32Array(CELL_COUNT * 2);
  for (let i = 0; i < cells.length; i++) cells[i] = next();
  const phase = new Int32Array(8);
  for (let i = 0; i < phase.length; i++) phase[i] = next();
  const blocked = new Int32Array(3);
  for (let i = 0; i < blocked.length; i++) blocked[i] = next();
  return { cells, side: next(), phase, blocked };
}

const ZOBRIST = makeZobrist();
const PHASE_INDEX: Record<string, number> = {
  placement: 0,
  movement: 1,
  chain: 2,
  blockadeRemoval: 3,
  gameOver: 4,
};

function hashState(state: GameState): number {
  let hi = 0;
  let lo = 0;
  const board = state.board;
  for (let i = 0; i < CELL_COUNT; i++) {
    const v = board[i];
    if (v === 0) continue;
    const k = ZOBRIST.cells[i * 2 + (v - 1)];
    lo ^= k;
    hi = (hi ^ (k >>> 16)) | 0;
  }
  if (state.turn === 'Dark') lo ^= ZOBRIST.side;
  lo ^= ZOBRIST.phase[PHASE_INDEX[state.phase] ?? 5];
  if (state.chainFrom >= 0) lo ^= ZOBRIST.cells[state.chainFrom * 2] * 31;
  // blockedPlayer MUST be in the key: it changes the legal move set through the
  // "must open a path" restriction, so two positions identical apart from it are
  // genuinely different nodes and must not share a transposition entry.
  lo ^= ZOBRIST.blocked[
    state.blockedPlayer === 'Light' ? 1 : state.blockedPlayer === 'Dark' ? 2 : 0
  ];
  // Combine into a 53-bit-safe number so collisions are negligible.
  return (hi >>> 0) * 4294967296 + (lo >>> 0);
}

// --- Transposition table ---------------------------------------------------

const enum Flag {
  Exact = 0,
  Lower = 1,
  Upper = 2,
}

interface TTEntry {
  depth: number;
  score: number;
  flag: Flag;
  move: AIMove | null;
}

// --- Search context --------------------------------------------------------

interface Ctx {
  nodes: number;
  deadline: number;
  aborted: boolean;
  tt: Map<number, TTEntry>;
  weights: EvalWeights;
  useQuiescence: boolean;
}

function outOfTime(ctx: Ctx): boolean {
  if (ctx.aborted) return true;
  // Checking the clock is relatively expensive, so sample it.
  if ((ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline) {
    ctx.aborted = true;
  }
  return ctx.aborted;
}

function outcomeScore(outcome: Outcome, perspective: Player, ply: number): number {
  if (outcome.kind === 'draw') return 0;
  return outcome.winner === perspective ? WIN_SCORE - ply : -(WIN_SCORE - ply);
}

function toAction(move: AIMove): Action {
  switch (move.kind) {
    case 'place':
      return { type: 'place', at: move.at };
    case 'move':
      return { type: 'move', from: move.from, to: move.to };
    case 'removeStone':
      return { type: 'removeStone', at: move.at };
    case 'endChain':
      return { type: 'endChain' };
  }
}

function applyMove(state: GameState, move: AIMove): GameState | null {
  const result = applyAction(state, toAction(move));
  return result.ok ? result.state : null;
}

/**
 * Candidate actions at a node, best-guess ordered: captures first (largest
 * first), then quiet moves. A good ordering is what makes alpha-beta actually
 * prune.
 */
function generateMoves(state: GameState, ttMove: AIMove | null): AIMove[] {
  const moves: AIMove[] = [];

  if (state.phase === 'placement') {
    const targets = legalMoves(state);
    const scored = targets.map((m) => ({
      move: { kind: 'place', at: m.to } as AIMove,
      score: scorePlacement(state.board, m.to, state.turn, state.variant),
    }));
    scored.sort((a, b) => b.score - a.score);
    // Placement branching is ~47 wide with a 24-turn horizon; searching it all
    // is pointless. Keep the plausible candidates only.
    return scored.slice(0, 10).map((s) => s.move);
  }

  if (state.phase === 'blockadeRemoval') {
    return legalMoves(state).map((m) => ({ kind: 'removeStone', at: m.to }) as AIMove);
  }

  const legal = legalMoves(state);
  const scored = legal.map((m) => ({
    move: { kind: 'move', from: m.from, to: m.to } as AIMove,
    score: m.captures.length * 1000,
  }));
  scored.sort((a, b) => b.score - a.score);
  for (const s of scored) moves.push(s.move);

  // Declining a chain is a real option and must be searched, or the AI is
  // forced into chains that lose material.
  if (state.phase === 'chain' && !state.variant.chainMustContinue) {
    moves.push({ kind: 'endChain' });
  }

  if (ttMove) {
    const idx = moves.findIndex((m) => sameMove(m, ttMove));
    if (idx > 0) {
      const [hit] = moves.splice(idx, 1);
      moves.unshift(hit);
    }
  }

  return moves;
}

export function sameMove(a: AIMove, b: AIMove): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'move' && b.kind === 'move') return a.from === b.from && a.to === b.to;
  if (a.kind === 'place' && b.kind === 'place') return a.at === b.at;
  if (a.kind === 'removeStone' && b.kind === 'removeStone') return a.at === b.at;
  return true;
}

/**
 * Capture-only search past the depth limit.
 *
 * `ply` is the distance from the root and is used only for mate-distance
 * scoring. `qply` is a SEPARATE counter for how deep the quiescence extension
 * itself has gone. Capping on `ply` was a bug: `depth + ply` is invariant along
 * any path, so every leaf sits at `ply === D`, and every iteration with
 * D >= MAX_QUIESCENCE_PLY returned stand-pat immediately — disabling
 * quiescence at precisely the depths the strong tiers reach.
 */
function quiescence(
  state: GameState,
  alpha: number,
  beta: number,
  ply: number,
  qply: number,
  ctx: Ctx,
): number {
  ctx.nodes++;
  if (state.outcome) return outcomeScore(state.outcome, state.turn, ply);
  if (outOfTime(ctx)) return evaluate(state, state.turn, ctx.weights);

  const standPat = evaluate(state, state.turn, ctx.weights);
  if (qply >= MAX_QUIESCENCE_PLY) return standPat;
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  const noisy = legalMoves(state).filter((m) => m.captures.length > 0);
  if (noisy.length === 0) return standPat;

  noisy.sort((a, b) => b.captures.length - a.captures.length);

  for (const candidate of noisy) {
    const move: AIMove = { kind: 'move', from: candidate.from, to: candidate.to };
    const child = applyMove(state, move);
    if (!child) continue;

    const score =
      child.turn === state.turn
        ? quiescence(child, alpha, beta, ply + 1, qply + 1, ctx)
        : -quiescence(child, -beta, -alpha, ply + 1, qply + 1, ctx);

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

function negamax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  ctx: Ctx,
): number {
  ctx.nodes++;

  if (state.outcome) return outcomeScore(state.outcome, state.turn, ply);
  if (outOfTime(ctx)) return evaluate(state, state.turn, ctx.weights);

  const originalAlpha = alpha;
  const key = hashState(state);
  const entry = ctx.tt.get(key);
  if (entry && entry.depth >= depth) {
    if (entry.flag === Flag.Exact) return entry.score;
    if (entry.flag === Flag.Lower && entry.score > alpha) alpha = entry.score;
    else if (entry.flag === Flag.Upper && entry.score < beta) beta = entry.score;
    if (alpha >= beta) return entry.score;
  }

  if (depth <= 0) {
    return ctx.useQuiescence
      ? quiescence(state, alpha, beta, ply, 0, ctx)
      : evaluate(state, state.turn, ctx.weights);
  }

  const moves = generateMoves(state, entry?.move ?? null);
  if (moves.length === 0) return evaluate(state, state.turn, ctx.weights);

  let best = -INFINITY;
  let bestMove: AIMove | null = null;

  for (const move of moves) {
    const child = applyMove(state, move);
    if (!child) continue;

    // Only flip perspective when the turn actually passes.
    const score =
      child.turn === state.turn
        ? negamax(child, depth - 1, alpha, beta, ply + 1, ctx)
        : -negamax(child, depth - 1, -beta, -alpha, ply + 1, ctx);

    if (score > best) {
      best = score;
      bestMove = move;
    }
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
    if (ctx.aborted) break;
  }

  if (bestMove === null) return evaluate(state, state.turn, ctx.weights);

  const flag =
    best <= originalAlpha ? Flag.Upper : best >= beta ? Flag.Lower : Flag.Exact;
  ctx.tt.set(key, { depth, score: best, flag, move: bestMove });

  return best;
}

/** Deterministic PRNG so a given seed always yields the same play. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SearchOptions {
  difficulty: Difficulty;
  seed?: number;
  weights?: EvalWeights;
  /** Overrides the difficulty's time budget, for tests. */
  timeBudgetMs?: number;
}

/**
 * Chooses a move for the side to move.
 *
 * Iterative deepening: each completed depth replaces the previous best, and an
 * aborted depth is discarded, so we always return the best move from the last
 * FULLY searched depth.
 */
export function findBestMove(state: GameState, options: SearchOptions): SearchResult {
  const started = Date.now();
  const config = DIFFICULTIES[options.difficulty] ?? DIFFICULTIES.medium;
  const budget = options.timeBudgetMs ?? config.timeBudgetMs;
  const rng = makeRng(options.seed ?? 0x5eed);

  const ctx: Ctx = {
    nodes: 0,
    deadline: started + budget,
    aborted: false,
    tt: new Map(),
    weights: options.weights ?? DEFAULT_WEIGHTS,
    useQuiescence: config.quiescence,
  };

  // Dropping history and repetition bookkeeping makes each node's state copy
  // O(1) instead of O(moves played). Repetition draws simply are not detected
  // inside the search, which is acceptable.
  const root: GameState = { ...state, history: [], positionCounts: {} };

  const rootMoves = generateMoves(root, null);
  if (rootMoves.length === 0) {
    return {
      move: null,
      score: 0,
      depth: 0,
      nodes: 0,
      elapsedMs: Date.now() - started,
      ranked: [],
    };
  }
  if (rootMoves.length === 1) {
    return {
      move: rootMoves[0],
      score: 0,
      depth: 0,
      nodes: 0,
      elapsedMs: Date.now() - started,
      ranked: [{ move: rootMoves[0], score: 0 }],
    };
  }

  let bestMove: AIMove = rootMoves[0];
  let bestScore = 0;
  let completedDepth = 0;
  let ranked: Array<{ move: AIMove; score: number }> = rootMoves.map((move) => ({
    move,
    score: 0,
  }));

  // Carrying alpha across root moves prunes well, but then every move after the
  // best one returns an upper BOUND rather than its true value. That is fine
  // when we only need the argmax; it is not fine for the weaker tiers, which
  // add noise to the scores and compare them against each other. So those tiers
  // search each root move on a full window and get exact, comparable values.
  const needExactRootScores = config.randomness > 0;

  for (let depth = 1; depth <= config.maxDepth; depth++) {
    let alpha = -INFINITY;
    const scores: Array<{ move: AIMove; score: number }> = [];
    let depthAborted = false;

    for (const move of rootMoves) {
      const child = applyMove(root, move);
      if (!child) continue;

      const lower = needExactRootScores ? -INFINITY : alpha;
      const score =
        child.turn === root.turn
          ? negamax(child, depth - 1, lower, INFINITY, 1, ctx)
          : -negamax(child, depth - 1, -INFINITY, -lower, 1, ctx);

      if (ctx.aborted) {
        depthAborted = true;
        break;
      }
      scores.push({ move, score });
      if (!needExactRootScores && score > alpha) alpha = score;
    }

    if (depthAborted || scores.length === 0) break;

    scores.sort((a, b) => b.score - a.score);
    ranked = scores;
    completedDepth = depth;

    // Noise is applied per completed depth so weaker tiers stay consistent
    // rather than flip-flopping between depths.
    if (config.randomness > 0) {
      const spread = config.randomness * 200;
      const noisy = scores.map((s) => ({
        move: s.move,
        score: s.score + (rng() - 0.5) * spread,
      }));
      noisy.sort((a, b) => b.score - a.score);
      bestMove = noisy[0].move;
      bestScore = scores.find((s) => sameMove(s.move, bestMove))?.score ?? noisy[0].score;
    } else {
      bestMove = scores[0].move;
      bestScore = scores[0].score;
    }

    // A forced win/loss is found; no deeper search will change the decision.
    if (Math.abs(bestScore) > WIN_SCORE / 2) break;
    if (Date.now() > ctx.deadline) break;
  }

  return {
    move: bestMove,
    score: bestScore,
    depth: completedDepth,
    nodes: ctx.nodes,
    elapsedMs: Date.now() - started,
    ranked,
  };
}
