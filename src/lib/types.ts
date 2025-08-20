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

export interface GameState {
  board: (Player | null)[][];
  current: Player;
  phase: Phase;
  stonesToPlace: Record<Player, number>;
  lastMover?: Player;
  chainOrigin?: Cell;
  moveHistory: MoveRecord[];
  variant: VariantFlags;
  winner?: Player;
  winReason?: {
    type: 'stoneCount';
    loserStoneCount: number;
    threshold: number;
    loser: Player;
  };
  placementCount: number; // Count of stones placed this turn during placement phase
  capturedLastMove: Cell[]; // Stones captured in the last move
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
}

export interface GameSession {
  startTime: number;
  endTime?: number;
  moves: number;
}