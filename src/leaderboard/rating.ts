// FILE: src/leaderboard/rating.ts
//
// Elo rating against fixed AI benchmark ratings.
//
// Rating a single-player game needs a reference point, so each difficulty tier
// is assigned a fixed rating. Beating a tier you already outrate gains little;
// losing to one you outrate costs a lot. That makes the ladder meaningful
// without a server or other human opponents.

import type { Difficulty } from '../ai/search';
import type { GameOutcomeKind } from './types';

export const STARTING_RATING = 1200;

export const AI_RATINGS: Record<Difficulty, number> = {
  beginner: 850,
  easy: 1100,
  medium: 1450,
  hard: 1800,
};

export const RATING_FLOOR = 100;

/** Provisional players move faster; established ratings settle down. */
export function kFactor(gamesPlayed: number): number {
  if (gamesPlayed < 10) return 40;
  if (gamesPlayed < 30) return 24;
  return 16;
}

export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

export function scoreOf(result: GameOutcomeKind): number {
  if (result === 'win') return 1;
  if (result === 'draw') return 0.5;
  return 0;
}

export function nextRating(
  rating: number,
  difficulty: Difficulty,
  result: GameOutcomeKind,
  gamesPlayed: number,
): number {
  const opponent = AI_RATINGS[difficulty] ?? AI_RATINGS.medium;
  const expected = expectedScore(rating, opponent);
  const delta = kFactor(gamesPlayed) * (scoreOf(result) - expected);
  return Math.max(RATING_FLOOR, Math.round(rating + delta));
}

/** Human-friendly rank title for a rating, used in the profile header. */
export function ratingTitle(rating: number): string {
  if (rating >= 1900) return 'grandmaster';
  if (rating >= 1700) return 'master';
  if (rating >= 1500) return 'expert';
  if (rating >= 1300) return 'skilled';
  if (rating >= 1100) return 'apprentice';
  return 'novice';
}
