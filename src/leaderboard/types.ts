// FILE: src/leaderboard/types.ts

import type { DrawReason, Player, WinReason } from '../engine';
import type { Difficulty } from '../ai/search';

export type ProfileSource = 'github' | 'local';

export interface PlayerProfile {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl?: string;
  readonly source: ProfileSource;
  readonly createdAt: number;
}

export type GameOutcomeKind = 'win' | 'loss' | 'draw';

export interface GameRecord {
  readonly id: string;
  readonly profileId: string;
  readonly playedAt: number;
  readonly durationMs: number;
  readonly result: GameOutcomeKind;
  readonly reason: WinReason | DrawReason;
  readonly playerColor: Player;
  readonly difficulty: Difficulty;
  /** Stones left on the board when the game ended. */
  readonly stonesOwn: number;
  readonly stonesOpponent: number;
  /** Stones this player captured / lost over the whole game. */
  readonly captures: number;
  readonly losses: number;
  /** Largest number of stones taken by a single move. */
  readonly bestCapture: number;
  readonly moves: number;
  readonly ratingBefore: number;
  readonly ratingAfter: number;
}

export interface DifficultyBreakdown {
  readonly games: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly winRate: number;
}

export interface PersonalRecords {
  readonly fastestWinMs: number | null;
  readonly fewestMovesWin: number | null;
  readonly largestCapture: number;
  readonly mostStonesRemaining: number;
  readonly longestWinStreak: number;
  readonly highestRating: number;
}

export interface ProfileStats {
  readonly profileId: string;
  readonly rating: number;
  readonly games: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly winRate: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly averageDurationMs: number;
  readonly averageMoves: number;
  readonly totalCaptures: number;
  readonly totalLosses: number;
  readonly favouriteColour: Player | null;
  readonly lastPlayedAt: number | null;
  readonly byDifficulty: Readonly<Record<Difficulty, DifficultyBreakdown>>;
  readonly records: PersonalRecords;
}

/** A row on the ladder — either a human profile or a benchmark AI opponent. */
export interface LeaderboardRow {
  readonly rank: number;
  readonly kind: 'player' | 'ai';
  readonly id: string;
  readonly name: string;
  readonly avatarUrl?: string;
  readonly rating: number;
  readonly games: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly winRate: number;
  readonly lastPlayedAt: number | null;
  readonly isCurrentUser: boolean;
}

export interface LeaderboardData {
  readonly version: number;
  readonly profiles: readonly PlayerProfile[];
  readonly games: readonly GameRecord[];
  readonly activeProfileId: string | null;
}
