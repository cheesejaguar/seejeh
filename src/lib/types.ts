// FILE: src/lib/types.ts

export type Player = 'Light' | 'Dark';

export interface Cell {
  r: number;
  c: number;
}

export type Phase = 'placement' | 'movement' | 'chain';

export interface VariantFlags {
  firstMoveMustEnterCenter: boolean;
  antiShuttle: boolean;
  blockadeOneRemoval: boolean;
}

export interface MoveRecord {
  pieceId: string;
  from: Cell;
  to: Cell;
  timestamp: number;
}

export type WinReason = 
  | { type: 'stoneCount'; loserStoneCount: number; threshold: number; loser: Player }
  | { type: 'resignation'; resignedPlayer: Player }
  | { type: 'stalemate'; drawType: 'mutual' | 'repetition' | 'insufficient' }
  | { type: 'timeout'; timedOutPlayer: Player };

export interface GameState {
  board: (Player | null)[][];
  current: Player;
  phase: Phase;
  stonesToPlace: Record<Player, number>;
  lastMover?: Player;
  chainOrigin?: Cell;
  moveHistory: MoveRecord[];
  variant: VariantFlags;
  winner?: Player | null; // null indicates draw
  winReason?: WinReason;
  placementCount: number; // Count of stones placed this turn during placement phase
  capturedLastMove: Cell[]; // Stones captured in the last move
  stalemateOffers: {
    Light: boolean;
    Dark: boolean;
  };
  moveRepetition: number; // Counter for repeated board positions
  lastBoardHash?: string; // Hash of board state for repetition detection
}

export interface CaptureResult {
  captured: Cell[];
}

export type Language = 'en' | 'ar';
export type AIDifficulty = 'beginner' | 'easy' | 'medium' | 'hard';

export interface PlayerConfig {
  type: 'human' | 'ai';
  difficulty?: AIDifficulty;
}

// GitHub User Types
export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  email?: string;
  name?: string;
}

// Match History Types
export interface GameResult {
  id: string;
  timestamp: number;
  winner: Player | null; // null for draws
  winReason?: WinReason;
  opponent: 'AI' | 'Guest'; // Since we're AI-only now
  aiDifficulty?: AIDifficulty;
  duration: number; // in seconds
  totalMoves: number;
  playerColor: Player;
  finalScore: {
    light: number;
    dark: number;
  };
  variant: VariantFlags;
}

// User Stats Types
export interface PlayerStats {
  totalGames: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  averageGameDuration: number;
  averageMovesPerGame: number;
  bestWinStreak: number;
  currentWinStreak: number;
  favoriteColor: Player;
  difficultyStats: Record<AIDifficulty, {
    games: number;
    wins: number;
    winRate: number;
  }>;
  recentGames: GameResult[];
}

// Auth State
export interface AuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  stats: PlayerStats | null;
  isLoading: boolean;
  error: string | null;
}

export interface GameSettings {
  language: Language;
  variant: VariantFlags;
  aiDifficulty: AIDifficulty;
  players: {
    Light: PlayerConfig;
    Dark: PlayerConfig;
  };
  hintsEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  capturePreviewsEnabled: boolean;
  moveAnalysisEnabled: boolean;
}

export interface GameSession {
  startTime: number;
  endTime?: number;
  moves: number;
}

// Move Analysis Types
export interface MoveAnalysis {
  move: AIMove;
  score: number;
  reasoning: string[];
  factors: {
    captures: number;
    centerControl: number;
    mobility: number;
    safety: number;
    positioning: number;
  };
  confidence: number; // 0-100
}

export interface AIMove {
  type: 'placement' | 'movement';
  cells: Cell[];
  from?: Cell;
  to?: Cell;
}

export interface MoveExplanation {
  primary: string;
  details: string[];
  evaluation: {
    strength: 'weak' | 'good' | 'strong' | 'excellent';
    reasoning: string;
  };
}