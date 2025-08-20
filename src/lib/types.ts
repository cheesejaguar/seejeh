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
  placementCount: number; // Count of stones placed this turn during placement phase
  capturedLastMove: Cell[]; // Stones captured in the last move
}

export interface CaptureResult {
  captured: Cell[];
}

export type Language = 'en' | 'ar';

export type GameMode = 'human-vs-human' | 'human-vs-ai';
export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface PlayerConfig {
  type: 'human' | 'ai';
  difficulty?: AIDifficulty;
}

export interface GameSettings {
  language: Language;
  variant: VariantFlags;
  gameMode: GameMode;
  aiDifficulty: AIDifficulty;
  players: {
    Light: PlayerConfig;
    Dark: PlayerConfig;
  };
}